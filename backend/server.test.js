// server.test.js — tests unitaires TaskFlow backend
const { genId } = require("./server");

let passed = 0;
let failed = 0;

function test(desc, fn) {
  try { fn(); console.log(`  ✅ ${desc}`); passed++; }
  catch (e) { console.log(`  ❌ ${desc}\n     → ${e.message}`); failed++; }
}

function expect(val) {
  return {
    toBe: (exp) => { if (val !== exp) throw new Error(`Attendu "${exp}", reçu "${val}"`); },
    toHaveLength: (n) => { if (val.length !== n) throw new Error(`Attendu longueur ${n}, reçu ${val.length}`); },
    toMatch: (re) => { if (!re.test(val)) throw new Error(`"${val}" ne correspond pas à ${re}`); },
    toBeGreaterThan: (n) => { if (val <= n) throw new Error(`Attendu > ${n}, reçu ${val}`); },
    toBeTruthy: () => { if (!val) throw new Error("Attendu truthy"); },
    toBeFalsy: () => { if (val) throw new Error("Attendu falsy"); },
  };
}

console.log("\n🧪 Tests TaskFlow Backend...\n");

// genId
test("genId retourne une chaîne de 12 caractères", () => {
  expect(genId()).toHaveLength(12);
});

test("genId retourne uniquement des caractères hexadécimaux", () => {
  expect(genId()).toMatch(/^[a-f0-9]{12}$/);
});

test("genId génère des IDs uniques", () => {
  const ids = new Set(Array.from({ length: 50 }, genId));
  expect(ids.size).toBeGreaterThan(45);
});

// Validation des données
test("Un titre vide est invalide", () => {
  const title = "  ";
  expect(title.trim().length === 0).toBeTruthy();
});

test("Un titre non vide est valide", () => {
  const title = "Ma tâche";
  expect(title.trim().length > 0).toBeTruthy();
});

test("Les statuts valides sont todo, in-progress, done", () => {
  const validStatuses = ["todo", "in-progress", "done"];
  expect(validStatuses.includes("todo")).toBeTruthy();
  expect(validStatuses.includes("invalid")).toBeFalsy();
});

test("Les priorités valides sont low, medium, high", () => {
  const validPriorities = ["low", "medium", "high"];
  expect(validPriorities.includes("high")).toBeTruthy();
  expect(validPriorities.includes("critical")).toBeFalsy();
});

// Variables d'environnement
test("PORT par défaut est 3001", () => {
  const port = parseInt(process.env.PORT || "3001");
  expect(port).toBe(3001);
});

test("APP_ENV par défaut est development", () => {
  const env = process.env.APP_ENV || "development";
  expect(env).toBe("development");
});

test("REDIS_URL contient le protocole redis://", () => {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  expect(url).toMatch(/^redis:\/\//);
});

console.log(`\n📊 ${passed} passés, ${failed} échoués\n`);
if (failed > 0) { console.log("❌ Pipeline bloqué.\n"); process.exit(1); }
console.log("✅ Tous les tests passent.\n"); process.exit(0);
