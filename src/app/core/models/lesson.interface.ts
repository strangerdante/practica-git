export interface Step {
    id: number;
    text: string;
    command?: string;
}

export interface Tip {
    text: string;
    type?: 'info' | 'pro' | 'warning';
}

export interface Practice {
    id: number;
    title: string;
    description: string;
    steps: Step[];
    setupCommands?: string[];
    tips?: Tip[];
}

export interface Lesson {
    id: number;
    title: string;
    description: string;
    steps: Step[]; // Main steps or fallback
    tips: Tip[]; // Main tips or fallback
    setupCommands?: string[]; // Main setup or fallback
    practices?: Practice[]; // Optional sub-lessons
}
