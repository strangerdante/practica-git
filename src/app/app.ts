import { Component, computed, inject, signal, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common'; // Need CommonModule for *ngIf/*ngFor
import { TerminalComponent } from './shared/components/terminal/terminal.component';
import { VisualizerComponent } from './shared/components/visualizer/visualizer.component';
import { LessonService } from './core/services/lesson.service';
import { Practice } from './core/models/lesson.interface';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TerminalComponent, VisualizerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private lessonService = inject(LessonService);

  readonly title = signal('Git Interactive');
  readonly currentLesson = this.lessonService.currentLesson;
  readonly currentPractice = this.lessonService.currentPractice; // Expose practice to template
  readonly lessons = this.lessonService.getLessons();

  // Resizing State
  @ViewChild('splitPanel') splitPanel!: ElementRef<HTMLElement>;
  isDragging = signal(false);
  visualizerHeight = signal(60); // Default 60%

  showLessonSelector = signal(false);

  toggleLessonSelector() {
    this.showLessonSelector.update(v => !v);
  }

  selectLesson(id: number) {
    this.lessonService.setLesson(id);
    this.showLessonSelector.set(false);
  }

  selectPractice(id: number) {
    this.lessonService.setPractice(id);
  }

  toggleStep(lessonId: number, stepId: number) {
    this.lessonService.toggleStepCompletion(lessonId, stepId);
  }

  get completedSteps() {
    return this.lessonService.completedSteps;
  }

  isPracticeCompleted(lessonId: number, practice: Practice): boolean {
    const completed = this.completedSteps()[lessonId] || [];
    if (!practice.steps || practice.steps.length === 0) return false;
    return practice.steps.every(s => completed.includes(s.id));
  }

  getPracticeButtonClass(lessonId: number, practice: Practice): string {
    const isSelected = this.currentPractice()?.id === practice.id;
    const isCompleted = this.isPracticeCompleted(lessonId, practice);

    if (isSelected) {
      return 'bg-[#6366f1] border-[#6366f1] text-white shadow-lg shadow-[#6366f1]/40 scale-105';
    }
    if (isCompleted) {
      return 'bg-[#6366f1]/10 border-[#6366f1] text-[#a5b4fc]';
    }
    return 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:border-[#6366f1]/50 hover:text-[#f1f5f9]';
  }

  @ViewChild('lessonSelectorContainer') lessonSelectorContainer!: ElementRef;

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.showLessonSelector() && this.lessonSelectorContainer && !this.lessonSelectorContainer.nativeElement.contains(event.target as Node)) {
      this.showLessonSelector.set(false);
    }
  }

  // Dragging Logic
  startDrag(event: MouseEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent) {
    if (!this.isDragging()) return;

    if (this.splitPanel) {
      const containerRect = this.splitPanel.nativeElement.getBoundingClientRect();
      const relativeY = event.clientY - containerRect.top;
      const percentage = (relativeY / containerRect.height) * 100;

      // Clamp between 20% and 80% to prevent total collapse
      const clamped = Math.max(20, Math.min(80, percentage));
      this.visualizerHeight.set(clamped);
    }
  }

  @HostListener('document:mouseup')
  stopDrag() {
    this.isDragging.set(false);
  }
}
