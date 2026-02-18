import { Component, inject, ViewChild, ElementRef, effect, ViewEncapsulation, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GitEngineService, Commit } from '../../../core/services/git-engine.service';
import { createGitgraph, templateExtend, TemplateName, Mode, Orientation } from '@gitgraph/js';

@Component({
    selector: 'app-visualizer',
    standalone: true,
    imports: [CommonModule],
    encapsulation: ViewEncapsulation.None,
    template: `
    <div class="h-full w-full bg-[#0f172a] border border-[#1e293b] rounded-lg overflow-hidden flex flex-col shadow-sm">
      
      <!-- Simple Header -->
      <div class=" bg-[#1e293b]/50 px-4 py-2 border-b border-[#334155]/30 flex justify-between items-center h-[50px]">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-[#6366f1]"></div>
          <span class="text-sm font-semibold text-[#f1f5f9]">Git History</span>
        </div>

        <!-- Network Activity Indicator (Center) -->
        <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
            
            <div class="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#0f172a]/80 border transition-colors duration-300"
                 [ngClass]="networkOp() ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-[#334155]/30'">
                 
                <!-- Status Text -->
                <span class="text-[10px] font-mono font-bold transition-colors duration-300 w-[100px] text-right" 
                      [ngClass]="{
                        'text-green-400': networkOp() === 'download', 
                        'text-blue-400': networkOp() === 'upload',
                        'text-[#475569]': !networkOp()
                      }">
                    {{ networkOp() === 'download' ? 'PULLING...' : (networkOp() === 'upload' ? 'PUSHING...' : 'DISCONNECTED') }}
                </span>

                <!-- Connection Line -->
                <div class="w-16 h-px bg-[#334155] relative overflow-visible flex items-center justify-center">
                     <!-- Static Dot (Always visible) -->
                     <div class="w-1 h-1 rounded-full bg-[#1e293b]" *ngIf="!networkOp()"></div>

                     <!-- Download: Right to Left (Remote to Local) -->
                     <div *ngIf="networkOp() === 'download'" class="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-download-h"></div>
                     
                     <!-- Upload: Left to Right (Local to Remote) -->
                     <div *ngIf="networkOp() === 'upload'" class="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_6px_rgba(96,165,250,0.8)] animate-upload-h"></div>
                </div>

                <!-- Server Icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                     class="transition-colors duration-300"
                     [ngClass]="networkOp() ? 'text-indigo-400' : 'text-[#475569]'">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6.01" y2="6"></line>
                    <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
            </div>
            
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-xs text-[#94a3b8]">Branch:</span>
          
          <div class="relative">
            <button 
                (click)="toggleBranchDropdown()"
                class="flex items-center gap-2 px-2 py-1 rounded bg-[#1e293b] text-[#22d3ee] text-xs font-mono border border-[#6366f1]/50 hover:bg-[#334155] hover:border-[#6366f1] transition-all cursor-pointer outline-none focus:ring-1 focus:ring-[#6366f1]">
                {{ currentBranch() || 'detached' }}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                     class="opacity-70 transition-transform duration-200"
                     [class.rotate-180]="isBranchDropdownOpen()">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            <!-- Overlay for click outside -->
            <div *ngIf="isBranchDropdownOpen()" 
                 class="fixed inset-0 z-40 bg-transparent cursor-default"
                 (click)="toggleBranchDropdown()">
            </div>

            <!-- Dropdown Menu -->
            <div *ngIf="isBranchDropdownOpen()" 
                 class="absolute right-0 top-[calc(100%+4px)] w-48 bg-[#0f172a] border border-[#334155] rounded-lg shadow-xl shadow-black/50 z-50 overflow-hidden backdrop-blur-sm">
                
                <div class="py-1 max-h-64 overflow-y-auto">
                    <button *ngFor="let branch of branchNames()"
                            (click)="checkoutBranch(branch)"
                            class="w-full text-left px-3 py-2 text-xs hover:bg-[#1e293b] flex items-center justify-between group transition-colors border-l-2 border-transparent hover:border-[#6366f1]">
                        <span class="font-mono text-[#cbd5e1] group-hover:text-white">{{ branch }}</span>
                        <span *ngIf="branch === currentBranch()" class="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_4px_rgba(74,222,128,0.5)]"></span>
                    </button>
                    
                    <div *ngIf="branchNames().length === 0" class="px-3 py-2 text-xs text-[#64748b] italic text-center">
                        No branches found
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Graph Container -->
      <div #scrollContainer class="flex-1 w-full h-full overflow-auto bg-[#0f172a] relative min-h-[180px]">
         <!-- Render Target -->
         <div #graphContainer class="w-full min-h-full p-4 md:p-6"></div>

         <!-- Empty State -->
         <div *ngIf="isEmpty()" class="flex flex-col items-center justify-center gap-3 text-[#6272a4] absolute inset-0 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <div class="text-center">
              <p class="text-sm font-medium text-[#94a3b8]">Repository Empty</p>
              <p class="text-xs text-[#1e293b]">Create your first commit</p>
            </div>
         </div>
      </div>
    </div>
  `,
    styles: [`
    /* Clean scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0f172a;
    }
    ::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }

    /* Horizontal Network Animations */
    @keyframes downloadPacketH {
      0% { left: 100%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { left: 0%; opacity: 0; }
    }

    @keyframes uploadPacketH {
      0% { left: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { left: 100%; opacity: 0; }
    }

    .animate-download-h {
      animation: downloadPacketH 1s infinite linear;
    }

    .animate-upload-h {
      animation: uploadPacketH 1s infinite linear;
    }
  `]
})

export class VisualizerComponent {
    @ViewChild('graphContainer') graphContainer!: ElementRef<HTMLDivElement>;
    @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

    gitService = inject(GitEngineService);
    currentBranch = this.gitService.currentBranch;
    networkOp = this.gitService.networkOperation;

    isBranchDropdownOpen = signal(false);
    branchNames = computed(() => Object.keys(this.gitService.branches()));

    toggleBranchDropdown() {
        this.isBranchDropdownOpen.update(v => !v);
    }

    checkoutBranch(branchName: string) {
        if (branchName === this.currentBranch()) {
            this.isBranchDropdownOpen.set(false);
            return;
        }

        this.gitService.checkout(branchName).then(() => {
            this.isBranchDropdownOpen.set(false);
        }).catch(err => {
            console.error(err);
            this.isBranchDropdownOpen.set(false);
        });
    }

    constructor() {
        effect(() => {
            const commits = this.gitService.commits();
            const branches = this.gitService.branches();
            const head = this.gitService.head();

            setTimeout(() => {
                this.renderGraph(commits, branches, head);
                this.scrollToLatest();
            }, 50);
        });
    }

    private scrollToLatest() {
        if (!this.scrollContainer) return;
        const el = this.scrollContainer.nativeElement;
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }

    isEmpty(): boolean {
        return Object.keys(this.gitService.commits()).length === 0;
    }

    renderGraph(commits: Record<string, Commit>, branches: Record<string, string | null>, head: string) {
        if (!this.graphContainer) return;
        const container = this.graphContainer.nativeElement;
        container.innerHTML = '';

        // Always render if not empty, or leave empty div
        if (Object.keys(commits).length === 0) return;

        try {
            const gitgraph = createGitgraph(container, {
                template: templateExtend(TemplateName.Metro, {
                    colors: ['#6366f1', '#e879f9', '#22d3ee', '#4ade80', '#facc15', '#fbbf24', '#f87171'],
                    branch: {
                        lineWidth: 2,
                        spacing: 60,
                        label: {
                            display: true,
                            bgColor: '#1e293b',
                            color: '#f1f5f9',
                            font: "normal 11pt Arial",
                            borderRadius: 10
                        }
                    },
                    commit: {
                        spacing: 90,
                        dot: {
                            size: 12,
                            strokeWidth: 0
                        },
                        message: {
                            displayAuthor: false,
                            displayHash: false,
                            font: "normal 12pt Arial",
                            color: "#f1f5f9"
                        }
                    },
                    arrow: {
                        size: 0,
                        offset: 0,
                        color: 'transparent'
                    }
                }),
                orientation: Orientation.Horizontal,
                mode: Mode.Compact
            });

            // Topological sort (Depth-based) to ensure parents render before children
            // This fixes issues where fast commits have identical timestamps
            const depthCache = new Map<string, number>();
            const getDepth = (hash: string | null): number => {
                if (!hash || !commits[hash]) return 0;
                if (depthCache.has(hash)) return depthCache.get(hash)!;

                const commit = commits[hash];
                const p1 = getDepth(commit.parent);
                const p2 = commit.mergeParent ? getDepth(commit.mergeParent) : 0;

                const d = Math.max(p1, p2) + 1;
                depthCache.set(hash, d);
                return d;
            };

            const sortedCommits = Object.values(commits).sort((a, b) => {
                const depthA = getDepth(a.hash);
                const depthB = getDepth(b.hash);
                if (depthA !== depthB) return depthA - depthB;
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            const commitBranchMap = new Map<string, string>();
            const processed = new Set<string>();

            const traceBranch = (hash: string | null, branchName: string) => {
                let curr = hash;
                while (curr && commits[curr] && !processed.has(curr)) {
                    commitBranchMap.set(curr, branchName);
                    processed.add(curr);
                    curr = commits[curr].parent;
                }
            };

            if (branches['main']) {
                traceBranch(branches['main'], 'main');
            }
            for (const [name, tip] of Object.entries(branches)) {
                if (name === 'main') continue;
                traceBranch(tip, name);
            }

            const branchInstances: Record<string, any> = {};

            const getBranch = (name: string, fromCommitHash?: string) => {
                if (branchInstances[name]) return branchInstances[name];

                let branch;
                if (fromCommitHash) {
                    const parentBranchName = commitBranchMap.get(fromCommitHash) || 'main';
                    const parentBranchInstance = branchInstances[parentBranchName];

                    if (parentBranchInstance) {
                        try {
                            branch = parentBranchInstance.branch({
                                name: name,
                                from: fromCommitHash
                            });
                        } catch (e) {
                            branch = parentBranchInstance.branch(name);
                        }
                    } else {
                        branch = gitgraph.branch(name);
                    }
                } else {
                    branch = gitgraph.branch(name);
                }

                branchInstances[name] = branch;
                return branch;
            };

            branchInstances['main'] = gitgraph.branch('main');

            for (const commit of sortedCommits) {
                const branchName = commitBranchMap.get(commit.hash) || 'main';
                const branch = getBranch(branchName, commit.parent || undefined);

                const commitOptions: any = {
                    subject: commit.message,
                    author: commit.author,
                    hash: commit.hash
                };

                const isHead = this.gitService.currentCommitHash() === commit.hash;
                if (isHead) {
                    commitOptions.style = {
                        dot: {
                            size: 12,
                            strokeWidth: 0,
                            color: '#4ade80'
                        },
                        message: {
                            color: '#4ade80',
                            font: "bold 12pt Arial"
                        }
                    };
                }

                if (commit.mergeParent) {
                    const sourceHash = commit.mergeParent;
                    const sourceBranchName = commitBranchMap.get(sourceHash);
                    let sourceBranch = branchInstances[sourceBranchName || ''];

                    if (sourceBranch) {
                        branch.merge({
                            branch: sourceBranch,
                            commitOptions: commitOptions
                        });
                    } else {
                        branch.commit(commitOptions);
                    }
                } else {
                    branch.commit(commitOptions);
                }
            }
        } catch (error) {
            console.error('GitGraph render error:', error);
        }
    }
}