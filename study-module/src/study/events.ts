import { StudyEvent } from './types';

type Listener = (event: StudyEvent) => void;

class StudyEventBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: StudyEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}

export const studyEventBus = new StudyEventBus();
