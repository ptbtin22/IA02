import { Router, Request, Response } from "express";
import { addTask, completeTask, getTasks } from "../tasks-store.js";

export const restRouter = Router();

// GET /api/tasks - Retrieve all tasks
restRouter.get("/tasks", (_req: Request, res: Response) => {
  res.json({ tasks: getTasks() });
});

// POST /api/tasks - Add a new task
restRouter.post("/tasks", (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text) {
    return res.status(400).json({ error: "Task text is required" });
  }
  const newTask = addTask(text);
  res.status(201).json({ message: `Added #${newTask.id}`, task: newTask });
});

// PATCH /api/tasks/:id/complete - Mark task as completed
restRouter.patch("/tasks/:id/complete", (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId || "0", 10);
  const task = completeTask(id);
  if (!task) {
    return res.status(404).json({ error: `Task #${id} not found` });
  }
  res.json({ message: `Completed #${id}`, task });
});
