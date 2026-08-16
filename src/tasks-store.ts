import type { Task } from "./types.js";

// Shared in-memory tasks state
export const tasks: Task[] = [];

/**
 * Get all tasks
 */
export function getTasks(): Task[] {
  return tasks;
}

/**
 * Add a new task
 */
export function addTask(text: string): Task {
  const newTask: Task = {
    id: tasks.length + 1,
    text,
    done: false,
  };
  tasks.push(newTask);
  return newTask;
}

/**
 * Mark a task as done
 */
export function completeTask(id: number): Task | null {
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  task.done = true;
  return task;
}

/**
 * Format tasks for display in tools
 */
export function formatTasksList(): string {
  if (tasks.length === 0) {
    return "No tasks yet.";
  }
  return tasks
    .map((t) => `${t.id} ${t.done ? "✅" : "⬜"} ${t.text}`)
    .join("\n");
}

/**
 * Format tasks for resource todo://list
 */
export function formatResourceText(): string {
  return tasks
    .map((t) => `${t.done ? "x" : " "} ${t.text}`)
    .join("\n");
}
