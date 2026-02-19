import { Component, ViewChild, AfterViewInit, OnDestroy, inject, effect, ElementRef, ViewEncapsulation, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgTerminal, NgTerminalModule } from 'ng-terminal';
import { FitAddon } from 'xterm-addon-fit';
import { GitEngineService } from '../../../core/services/git-engine.service';
import { LessonService } from '../../../core/services/lesson.service';

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [CommonModule, NgTerminalModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="h-full w-full bg-[#0f172a] rounded-lg overflow-hidden border border-slate-800 shadow-2xl flex flex-col font-mono text-sm">
      <!-- Terminal Header -->
      <div class="bg-slate-950 px-4 py-2 flex items-center gap-2 border-b border-slate-800 select-none shrink-0">
        <div class="flex gap-1.5">
          <div class="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"></div>
          <div class="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"></div>
        </div>
        <span class="text-slate-500 text-xs ml-2 flex-1 text-center font-medium">user@git-interactive:~/project</span>
      </div>
      
      <!-- NgTerminal container -->
      <div class="flex-1 relative bg-[#0f172a] overflow-hidden p-0" #terminalContainer>
        <ng-terminal #term></ng-terminal>
      </div>
    </div>
  `,
  styles: [`
    /* Ensure the terminal fills the container */
    app-terminal {
        display: block;
        height: 100%;
        overflow: hidden;
    }
    .xterm-viewport::-webkit-scrollbar {
        width: 8px;
    }
    .xterm-viewport::-webkit-scrollbar-track {
        background: transparent;
    }
    .xterm-viewport::-webkit-scrollbar-thumb {
        background-color: #334155;
        border-radius: 4px;
    }
    
    /* Force background color on all xterm layers to match theme */
    ng-terminal, 
    .ng-terminal, 
    .xterm, 
    .xterm-viewport, 
    .xterm-screen,
    .xterm-container,
    .terminal.xterm {
        background-color: #0f172a !important;
        height: 100% !important;
    }
    
    ng-terminal {
        display: block;
        height: 100%;
        width: 100%;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
    }

    /* Eliminar bordes y outlines internos de xterm */
    .xterm,
    .xterm-viewport,
    .xterm-screen,
    .xterm-container,
    .terminal.xterm,
    .ng-terminal,
    .xterm-helper-textarea {
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
    }

    /* El textarea oculto de xterm no debe generar espacio visual */
    .xterm-helper-textarea {
        opacity: 0 !important;
        position: fixed !important;
        left: -9999em !important;
    }

    /* Ensure canvas background matches */
    .xterm-text-layer,
    .xterm-selection-layer, 
    .xterm-link-layer,
    .xterm-cursor-layer {
         background-color: transparent !important;
    }
  `]
})
export class TerminalComponent implements AfterViewInit, OnDestroy {
  @ViewChild('term', { static: false }) child!: NgTerminal;
  @ViewChild('terminalContainer') terminalContainer!: ElementRef<HTMLDivElement>;

  gitService = inject(GitEngineService);
  lessonService = inject(LessonService);

  private commandHistory: string[] = [];
  private historyIndex = -1;
  private currentCommand = '';
  private cursorPosition = 0;
  private tempCommand = ''; // Store current input when moving up in history

  private fitAddon!: FitAddon;
  private resizeObserver!: ResizeObserver;

  constructor() {
    // Reset terminal on lesson change
    effect(() => {
      this.lessonService.currentLesson(); // Dependency
      this.resetTerminal();
    }, { allowSignalWrites: true });

    // Update prompt on branch or cwd change
    effect(() => {
      // Register dependencies
      this.gitService.currentBranch();
      this.gitService.cwd();

      untracked(() => {
        if (this.child && this.child.underlying) {
          this.updatePromptLine();
        }
      });
    });
  }

  ngAfterViewInit() {
    // Configure terminal
    if (this.child.underlying) {
      this.child.underlying.options.cursorBlink = true;
      this.child.underlying.options.fontFamily = 'Menlo, Monaco, "Courier New", monospace';
      this.child.underlying.options.fontSize = 14;
      this.child.underlying.options.theme = {
        background: '#0f172a', // slate-900 like
        foreground: '#e2e8f0',
        cursor: '#22d3ee',
        selectionBackground: '#334155'
      };

      // Initialize FitAddon
      this.fitAddon = new FitAddon();
      this.child.underlying.loadAddon(this.fitAddon);

      // Setup ResizeObserver to watch container size changes
      this.resizeObserver = new ResizeObserver(() => {
        // Wrap fit in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
        requestAnimationFrame(() => {
          try {
            this.fitAddon.fit();
          } catch (e) {
            // Ignore fit errors during rapid resize
          }
        });
      });

      if (this.terminalContainer) {
        this.resizeObserver.observe(this.terminalContainer.nativeElement);
      }

      // Early fit attempt
      setTimeout(() => this.fitAddon.fit(), 100);
    }

    this.writeWelcome();
    this.writePrompt();

    // Handle Input
    this.child.onData().subscribe((data) => {
      this.handleInput(data);
    });
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  resetTerminal() {
    if (this.child && this.child.underlying) {
      this.child.underlying.reset();
      this.commandHistory = [];
      this.historyIndex = -1;
      this.currentCommand = '';
      this.cursorPosition = 0;
      this.writeWelcome();
      this.writePrompt();
    }
  }

  private handleInput(data: string) {
    const term = this.child.underlying;
    if (!term) return;

    // Handle special keys
    switch (data) {
      case '\r': // Enter
        term.write('\r\n');
        this.executeCommand();
        break;

      case '\u007F': // Backspace
        if (this.cursorPosition > 0) {
          const before = this.currentCommand.slice(0, this.cursorPosition - 1);
          const after = this.currentCommand.slice(this.cursorPosition);
          this.currentCommand = before + after;
          this.cursorPosition--;

          // Move back, write the rest of the command, clear the last character, and move cursor back
          term.write('\b');
          term.write(after + ' \b');
          for (let i = 0; i < after.length; i++) {
            term.write('\b');
          }
        }
        break;

      case '\x1b[A': // Up Arrow
        this.navigateHistory('up');
        break;

      case '\x1b[B': // Down Arrow
        this.navigateHistory('down');
        break;

      case '\x1b[D': // Left Arrow
        if (this.cursorPosition > 0) {
          this.cursorPosition--;
          term.write('\x1b[D');
        }
        break;

      case '\x1b[C': // Right Arrow
        if (this.cursorPosition < this.currentCommand.length) {
          this.cursorPosition++;
          term.write('\x1b[C');
        }
        break;

      case '\x03': // Ctrl+C
        term.write('^C\r\n');
        this.currentCommand = '';
        this.cursorPosition = 0;
        this.writePrompt();
        break;

      default:
        // Filter printable characters
        if (data.length === 1 && data.charCodeAt(0) >= 32) {
          const before = this.currentCommand.slice(0, this.cursorPosition);
          const after = this.currentCommand.slice(this.cursorPosition);
          this.currentCommand = before + data + after;
          this.cursorPosition++;
          this.renderCommand(after);
        }
    }
  }

  private renderCommand(suffix: string = '') {
    const term = this.child.underlying;
    if (!term) return;

    // Get current char added plus everything after it
    const char = this.currentCommand[this.cursorPosition - 1] || '';
    term.write(char + suffix);

    // Move cursor back to the correct position if we inserted in the middle
    if (suffix.length > 0) {
      for (let i = 0; i < suffix.length; i++) {
        term.write('\x1b[D');
      }
    }
  }

  private navigateHistory(direction: 'up' | 'down') {
    if (this.commandHistory.length === 0) return;

    if (direction === 'up') {
      if (this.historyIndex === -1) {
        this.tempCommand = this.currentCommand;
        this.historyIndex = this.commandHistory.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      } else {
        return; // Already at top
      }
    } else { // down
      if (this.historyIndex === -1) return;

      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = -1;
        this.setInput(this.tempCommand);
        return;
      }
    }

    this.setInput(this.commandHistory[this.historyIndex]);
  }

  private setInput(newCommand: string) {
    const term = this.child.underlying;
    if (!term) return;

    // Clear current line visual
    const oldLen = this.currentCommand.length;
    // Move cursor to start of input
    for (let i = 0; i < this.cursorPosition; i++) term.write('\b');
    // Clear the whole line
    let spaces = '';
    for (let i = 0; i < oldLen; i++) spaces += ' ';
    term.write(spaces);
    // Move back to start
    for (let i = 0; i < oldLen; i++) term.write('\b');

    this.currentCommand = newCommand;
    this.cursorPosition = newCommand.length;
    term.write(newCommand);
  }

  private async executeCommand() {
    const cmd = this.currentCommand.trim();

    if (cmd) {
      this.commandHistory.push(cmd);
      this.historyIndex = -1;

      if (cmd === 'clear' || cmd === 'cls') {
        this.child.underlying?.reset();
      } else {
        try {
          const output = await this.gitService.runCommand(cmd);
          if (output) {
            this.child.write(this.colorize(output));
            this.child.write('\r\n');
          }
          // Auto-check practice steps that match the executed command
          this.lessonService.autoCheckCommandMatch(cmd);
        } catch (e) {
          this.child.write(`\x1b[31mError: ${e}\x1b[0m\r\n`);
        }
      }
    }

    this.currentCommand = '';
    this.cursorPosition = 0;
    this.writePrompt();
  }

  private updatePromptLine() {
    if (!this.child?.underlying) return;
    const term = this.child.underlying;

    // Clear line and return to start
    term.write('\x1b[2K\r');

    this.writePrompt();

    // Restore User Input
    if (this.currentCommand) {
      term.write(this.currentCommand);

      // Restore cursor
      const diff = this.currentCommand.length - this.cursorPosition;
      if (diff > 0) {
        term.write(`\x1b[${diff}D`);
      }
    }
  }

  private writePrompt() {
    const branch = this.gitService.currentBranch();
    const cwd = this.gitService.cwd();
    const path = `\x1b[1;36m${cwd}\x1b[0m`; // Cyan bold path
    const branchStr = branch ? ` \x1b[1;35m(${branch})\x1b[0m` : '';

    // We don't clear line here by default since we might be appending, 
    // but usually in this specific shell simulation we are always at clean line when calling this.
    // However, updatePromptLine handles the clearing.
    this.child.write(`\r${path}${branchStr} $ `);
  }

  private writeWelcome() {
    const welcome = [
      '\x1b[2mGit Interactive Shell v1.0.0\x1b[0m',
      '\x1b[2mEscribe \x1b[1mgit --help\x1b[2m para ver la ayuda.\x1b[0m',
      '\x1b[2mEscribe \x1b[1mclear\x1b[2m para limpiar la terminal.\x1b[0m',
      ''
    ].join('\r\n');
    this.child.write(welcome + '\r\n');
  }

  private colorize(text: string): string {
    const RED = '\x1b[1;31m';
    const GREEN = '\x1b[1;32m';
    const YELLOW = '\x1b[1;33m';
    const CYAN = '\x1b[1;36m';
    const MAGENTA = '\x1b[1;35m';
    const RESET = '\x1b[0m';
    const BOLD = '\x1b[1m';

    // Fix newlines to \r\n for xterm
    let out = text.replace(/\n/g, '\r\n');

    out = out
      // Labels for git status
      .replace(/Staged:/g, `${GREEN}${BOLD}Staged:${RESET}`)
      .replace(/Modified:/g, `${YELLOW}${BOLD}Modified:${RESET}`)
      .replace(/Untracked:/g, `${RED}${BOLD}Untracked:${RESET}`)

      // Git prefixes
      .replace(/fatal:/g, `${RED}${BOLD}fatal:${RESET}`)
      .replace(/error:/g, `${RED}${BOLD}error:${RESET}`)

      // Diff header
      .replace(/^(\+\+\+.*)$/gm, `${GREEN}${BOLD}$1${RESET}`)
      .replace(/^(\-\-\-.*)$/gm, `${RED}${BOLD}$1${RESET}`)
      // Diff chunks
      .replace(/^(@@.*@@)$/gm, `${CYAN}$1${RESET}`)
      // Diff lines
      .replace(/(^|\r\n)(\+)([^\+].*)/gm, `$1${GREEN}+$3${RESET}`)
      .replace(/(^|\r\n)(\-)([^\-].*)/gm, `$1${RED}-$3${RESET}`);

    return out + RESET;
  }
}
