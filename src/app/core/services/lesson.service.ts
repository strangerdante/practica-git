import { Injectable, signal, computed } from '@angular/core';
import { GitEngineService } from './git-engine.service';
import { Lesson } from '../models/lesson.interface';
import { lesson1 } from '../data/lesson-1';
import { lesson2 } from '../data/lesson-2';
import { lesson3 } from '../data/lesson-3';
import { lesson4 } from '../data/lesson-4';
import { lesson5 } from '../data/lesson-5';
import { lesson6 } from '../data/lesson-6';
import { lesson7 } from '../data/lesson-7';
import { lesson8 } from '../data/lesson-8';

const STORAGE_KEY = 'git-practice-progress';

@Injectable({
    providedIn: 'root'
})
export class LessonService {
    private lessons = signal<Lesson[]>([lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson7, lesson8]);

    // Current active lesson
    currentLessonId = signal<number>(1);
    currentPracticeId = signal<number | null>(null);

    currentLesson = computed(() => {
        return this.lessons().find(l => l.id === this.currentLessonId());
    });

    currentPractice = computed(() => {
        const lesson = this.currentLesson();
        if (!lesson?.practices?.length) return null;
        return lesson.practices.find(p => p.id === this.currentPracticeId()) || null;
    });

    constructor(private gitService: GitEngineService) {
        this.loadProgress();
    }

    async setLesson(id: number) {
        this.currentLessonId.set(id);
        const lesson = this.lessons().find(l => l.id === id);

        if (lesson?.practices && lesson.practices.length > 0) {
            // Default to first practice
            await this.setPractice(lesson.practices[0].id);
        } else {
            this.currentPracticeId.set(null);
            await this.initializeEnvironment(lesson?.setupCommands);
        }
        this.saveProgress();
    }

    async setPractice(practiceId: number) {
        this.currentPracticeId.set(practiceId);
        const lesson = this.currentLesson();
        const practice = lesson?.practices?.find(p => p.id === practiceId);

        if (practice) {
            await this.initializeEnvironment(practice.setupCommands);
        }
        this.saveProgress();
    }

    private async initializeEnvironment(commands?: string[]) {
        // Reset state first (GitEngineService init now clears everything)
        await this.gitService.init();

        if (commands) {
            for (const cmd of commands) {
                try {
                    const result = await this.gitService.runCommand(cmd);
                    if (result && result.startsWith('Error')) {
                        console.error(`Setup command '${cmd}' failed:`, result);
                    }
                } catch (e) {
                    console.error(`Setup command '${cmd}' threw exception:`, e);
                }
            }
        }
    }

    getLessons() {
        return this.lessons; // Return the signal itself for reactivity in template iteration
    }

    // Track completed steps per lesson: { lessonId: [stepId, stepId, ...] }
    completedSteps = signal<Record<number, number[]>>({});

    toggleStepCompletion(lessonId: number, stepId: number) {
        this.completedSteps.update(current => {
            const lessonSteps = current[lessonId] || [];
            let newSteps;
            if (lessonSteps.includes(stepId)) {
                newSteps = lessonSteps.filter(id => id !== stepId);
            } else {
                newSteps = [...lessonSteps, stepId];
            }
            const updated = {
                ...current,
                [lessonId]: newSteps
            };
            this.saveProgress(updated);
            return updated;
        });
    }

    private saveProgress(steps?: Record<number, number[]>) {
        const state = {
            currentLessonId: this.currentLessonId(),
            currentPracticeId: this.currentPracticeId(),
            completedSteps: steps || this.completedSteps()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    private loadProgress() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const state = JSON.parse(stored);
                // Restore state without triggering side effects
                if (state.currentLessonId) this.currentLessonId.set(state.currentLessonId);
                if (state.currentPracticeId) this.currentPracticeId.set(state.currentPracticeId);
                if (state.completedSteps) this.completedSteps.set(state.completedSteps);
            } catch (e) {
                console.error('Failed to load progress', e);
            }
        }
    }

    resetProgress() {
        this.completedSteps.set({});
        localStorage.removeItem(STORAGE_KEY);
        this.setLesson(1);
    }

    checkCommandMatch(input: string, expected: string): boolean {
        if (!input || !expected) return false;
        return input.trim().replace(/\s+/g, ' ') === expected.trim().replace(/\s+/g, ' ');
    }
}
