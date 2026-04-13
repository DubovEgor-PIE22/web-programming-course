import { useState, useEffect, useCallback, useRef } from "react";
import "./styles.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

type QueuedOp =
  | { type: "ADD"; tempId: string; title: string }
  | { type: "TOGGLE"; id: number; done: boolean }
  | { type: "DELETE"; id: number };

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const QUEUE_KEY = "todo-offline-queue";

// ─────────────────────────────────────────────────────────────────────────────
// Queue helpers (localStorage — переживает перезагрузку)
// ─────────────────────────────────────────────────────────────────────────────
function loadQueue(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Worker registration
// ─────────────────────────────────────────────────────────────────────────────
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    console.log("[SW] registered:", reg.scope);

    // Слушаем сигнал от SW о необходимости синхронизации
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "SYNC_QUEUE") {
        window.dispatchEvent(new Event("online"));
      }
    });
  } catch (err) {
    console.warn("[SW] registration failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App component
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncingRef = useRef(false); // защита от параллельного sync

  // ── Инициализация ────────────────────────────────────────────────────────
  useEffect(() => {
    registerSW();
    fetchTodos();

    const goOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Загрузка todos ────────────────────────────────────────────────────────
  async function fetchTodos() {
    try {
      const res = await fetch(`${API}/api/todos`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Todo[] = await res.json();
      setTodos(data);
      setError(null);
    } catch {
      setError("Нет соединения — показаны кэшированные данные");
    }
  }

  // ── Синхронизация offline-очереди ────────────────────────────────────────
  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = loadQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const remaining: QueuedOp[] = [];

    for (const op of queue) {
      try {
        if (op.type === "ADD") {
          await fetch(`${API}/api/todos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: op.title }),
          });
        } else if (op.type === "TOGGLE") {
          await fetch(`${API}/api/todos/${op.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ done: op.done }),
          });
        } else if (op.type === "DELETE") {
          await fetch(`${API}/api/todos/${op.id}`, { method: "DELETE" });
        }
        // Операция прошла — НЕ добавляем в remaining
      } catch {
        // Ошибка — оставляем для следующей попытки
        remaining.push(op);
      }
    }

    saveQueue(remaining);
    syncingRef.current = false;
    setIsSyncing(false);

    // Перезагрузить актуальный список
    await fetchTodos();
  }, []);

  // ── Добавить todo ─────────────────────────────────────────────────────────
  async function addTodo() {
    const title = newTitle.trim();
    if (!title) return;

    // Оптимистичное обновление UI
    const tempId = `temp-${Date.now()}`;
    const optimistic: Todo = {
      id: Date.now(),
      title,
      done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTodos((prev) => [optimistic, ...prev]);
    setNewTitle("");

    try {
      const res = await fetch(`${API}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      const created: Todo = await res.json();
      setTodos((prev) =>
        prev.map((t) => (t.id === optimistic.id ? created : t))
      );
    } catch {
      // Сохранить в очередь, оставить оптимистичный элемент
      const queue = loadQueue();
      queue.push({ type: "ADD", tempId, title });
      saveQueue(queue);
    }
  }

  // ── Toggle done ───────────────────────────────────────────────────────────
  async function toggleTodo(todo: Todo) {
    const updated = { ...todo, done: !todo.done };
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));

    try {
      const res = await fetch(`${API}/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: updated.done }),
      });
      if (!res.ok) throw new Error();
    } catch {
      const queue = loadQueue();
      queue.push({ type: "TOGGLE", id: todo.id, done: updated.done });
      saveQueue(queue);
    }
  }

  // ── Delete todo ───────────────────────────────────────────────────────────
  async function deleteTodo(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`${API}/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      const queue = loadQueue();
      queue.push({ type: "DELETE", id });
      saveQueue(queue);
    }
  }

  // ── Pending queue count ───────────────────────────────────────────────────
  const pendingCount = loadQueue().length;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Статус сети ── */}
      <div className={`network-status ${isOnline ? "online" : "offline"}`}>
        {isOnline ? (
          <>
            🟢 Online
            {isSyncing && <span className="syncing"> · синхронизация...</span>}
            {!isSyncing && pendingCount > 0 && (
              <span className="pending"> · {pendingCount} в очереди</span>
            )}
          </>
        ) : (
          <>
            🔴 Offline
            {pendingCount > 0 && (
              <span className="pending"> · {pendingCount} операций в очереди</span>
            )}
          </>
        )}
      </div>

      <h1 className="title">📝 Todo PWA</h1>

      {error && <p className="error">{error}</p>}

      {/* ── Форма добавления ── */}
      <div className="add-form">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Новая задача..."
          className="input"
        />
        <button onClick={addTodo} className="btn btn-primary">
          Добавить
        </button>
      </div>

      {/* ── Список todos ── */}
      <ul className="todo-list">
        {todos.length === 0 && (
          <li className="empty">Задачи не найдены</li>
        )}
        {todos.map((todo) => (
          <li key={todo.id} className={`todo-item ${todo.done ? "done" : ""}`}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo)}
              className="checkbox"
            />
            <span className="todo-title">{todo.title}</span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="btn btn-danger btn-sm"
              title="Удалить"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* ── Offline-очередь (debug) ── */}
      {pendingCount > 0 && (
        <div className="queue-info">
          <details>
            <summary>Офлайн-очередь ({pendingCount})</summary>
            <pre>{JSON.stringify(loadQueue(), null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
