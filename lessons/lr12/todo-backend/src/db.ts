import fs from "node:fs";
import path from "node:path";

const dbFile = path.resolve(process.cwd(), process.env.DB_FILE ?? "./data/todo.json");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ todos: [], seq: 0 }));

export type Todo = { id: number; title: string; done: boolean; createdAt: string; updatedAt: string };
type Store = { todos: Todo[]; seq: number };

const read = (): Store => JSON.parse(fs.readFileSync(dbFile, "utf8"));
const write = (s: Store) => fs.writeFileSync(dbFile, JSON.stringify(s, null, 2));

export const listTodos = (): Todo[] => read().todos.slice().reverse();

export const getTodo = (id: number): Todo | null => read().todos.find((t) => t.id === id) ?? null;

export const createTodo = (title: string): Todo => {
  const s = read();
  const todo: Todo = { id: ++s.seq, title: title.trim(), done: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  s.todos.push(todo);
  write(s);
  return todo;
};

export const updateTodo = (id: number, patch: { title?: string; done?: boolean }): Todo | null => {
  const s = read();
  const i = s.todos.findIndex((t) => t.id === id);
  if (i === -1) return null;
  s.todos[i] = { ...s.todos[i], ...patch, updatedAt: new Date().toISOString() };
  write(s);
  return s.todos[i];
};

export const deleteTodo = (id: number): boolean => {
  const s = read();
  const before = s.todos.length;
  s.todos = s.todos.filter((t) => t.id !== id);
  write(s);
  return s.todos.length < before;
};
