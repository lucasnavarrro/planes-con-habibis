const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "data", "plans.json");
const SEED_FILE = path.join(__dirname, "data", "plans.seed.json");

const DIAS = ["Jueves", "Viernes", "Sábado", "Domingo"];

function loadState() {
  let loaded;
    const isNew = !fs.existsSync(DATA_FILE);
      if (isNew) {
          loaded = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
            } else {
                loaded = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
                  }
                    // migración: asegurar que todos los planes (incluso los ya guardados) tengan día
                      let migrated = false;
                        (loaded.plans || []).forEach((p) => {
                            if (!DIAS.includes(p.dia)) {
                                  p.dia = "Sábado";
                                        migrated = true;
                                            }
                                              });
                                                if (isNew || migrated) {
                                                    fs.writeFileSync(DATA_FILE, JSON.stringify(loaded, null, 2));
                                                      }
                                                        return loaded;
                                                        }

                                                        function saveState(state) {
                                                          fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
                                                          }

                                                          let state = loadState();
                                                          if (!state.users) state.users = {};

                                                          const app = express();
                                                          const server = http.createServer(app);
                                                          const io = new Server(server);

                                                          app.use(express.json());
                                                          app.use(express.static(path.join(__dirname, "public")));

                                                          function planWithBudget(plan) {
                                                            const cover = Number(plan.cover) || 0;
                                                              const consumo = Number(plan.consumoPromedio) || 0;
                                                                const transporte = Number(plan.transporteCosto) || 0;
                                                                  const totalPorPersona = cover + consumo + transporte * 2; // ida y vuelta
                                                                    return {
                                                                        ...plan,
                                                                            votos: plan.votes.length,
                                                                                totalPorPersona,
                                                                                  };
                                                                                  }

                                                                                  function publicState() {
                                                                                    const plansSorted = [...state.plans]
                                                                                        .map(planWithBudget)
                                                                                            .sort((a, b) => b.votos - a.votos);
                                                                                              return {
                                                                                                  groupSize: state.groupSize,
                                                                                                      startZone: state.startZone,
                                                                                                          dias: DIAS,
                                                                                                              plans: plansSorted,
                                                                                                                };
                                                                                                                }
                                                                                                                
                                                                                                                function broadcast() {
                                                                                                                  io.emit("state", publicState());
                                                                                                                  }
                                                                                                                  
                                                                                                                  app.get("/api/state", (req, res) => {
                                                                                                                    res.json(publicState());
                                                                                                                    });
                                                                                                                    
                                                                                                                    app.post("/api/join", (req, res) => {
                                                                                                                      const name = (req.body.name || "").trim().slice(0, 40);
                                                                                                                        if (!name) return res.status(400).json({ error: "Falta nombre" });
                                                                                                                          const userId = crypto.randomUUID();
                                                                                                                            state.users[userId] = { name, joinedAt: Date.now() };
                                                                                                                              saveState(state);
                                                                                                                                res.json({ userId, name });
                                                                                                                                });
                                                                                                                                
                                                                                                                                app.post("/api/vote", (req, res) => {
                                                                                                                                  const { planId, userId } = req.body;
                                                                                                                                    if (!planId || !userId || !state.users[userId]) {
                                                                                                                                        return res.status(400).json({ error: "Datos inválidos" });
                                                                                                                                          }
                                                                                                                                            const plan = state.plans.find((p) => p.id === planId);
                                                                                                                                              if (!plan) return res.status(404).json({ error: "Plan no existe" });
                                                                                                                                              
                                                                                                                                                // un voto por usuario POR DÍA: quitarlo solo de otros planes del mismo día primero
                                                                                                                                                  state.plans
                                                                                                                                                      .filter((p) => p.dia === plan.dia)
                                                                                                                                                          .forEach((p) => {
                                                                                                                                                                p.votes = p.votes.filter((v) => v !== userId);
                                                                                                                                                                    });
                                                                                                                                                                    
                                                                                                                                                                      const idx = plan.votes.indexOf(userId);
                                                                                                                                                                        if (idx === -1) {
                                                                                                                                                                            plan.votes.push(userId);
                                                                                                                                                                              }
                                                                                                                                                                                // si ya estaba (toggle off), se queda sin voto en ese día
                                                                                                                                                                                
                                                                                                                                                                                  saveState(state);
                                                                                                                                                                                    broadcast();
                                                                                                                                                                                      res.json({ ok: true });
                                                                                                                                                                                      });
                                                                                                                                                                                      
                                                                                                                                                                                      app.post("/api/plans", (req, res) => {
                                                                                                                                                                                        const { name, zone, dia, tipo, cover, consumoPromedio, transporteCosto, transporteNota, coverNota, fuente, addedBy } =
                                                                                                                                                                                            req.body;
                                                                                                                                                                                              if (!name || !zone) {
                                                                                                                                                                                                  return res.status(400).json({ error: "Falta nombre o zona" });
                                                                                                                                                                                                    }
                                                                                                                                                                                                      const newPlan = {
                                                                                                                                                                                                          id: crypto.randomUUID(),
                                                                                                                                                                                                              name: String(name).slice(0, 60),
                                                                                                                                                                                                                  zone: String(zone).slice(0, 60),
                                                                                                                                                                                                                      dia: DIAS.includes(dia) ? dia : "Sábado",
                                                                                                                                                                                                                          tipo: String(tipo || "Plan sugerido").slice(0, 60),
                                                                                                                                                                                                                              vibe: [],
                                                                                                                                                                                                                                  cover: Number(cover) || 0,
                                                                                                                                                                                                                                      coverNota: String(coverNota || "").slice(0, 200),
                                                                                                                                                                                                                                          consumoPromedio: Number(consumoPromedio) || 0,
                                                                                                                                                                                                                                              transporteNota: String(transporteNota || "").slice(0, 200),
                                                                                                                                                                                                                                                  transporteCosto: Number(transporteCosto) || 0,
                                                                                                                                                                                                                                                      fuente: String(fuente || "").slice(0, 300),
                                                                                                                                                                                                                                                          addedBy: String(addedBy || "Anónimo").slice(0, 40),
                                                                                                                                                                                                                                                              votes: [],
                                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                                  state.plans.push(newPlan);
                                                                                                                                                                                                                                                                    saveState(state);
                                                                                                                                                                                                                                                                      broadcast();
                                                                                                                                                                                                                                                                        res.json({ ok: true, plan: newPlan });
                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                        app.post("/api/group-size", (req, res) => {
                                                                                                                                                                                                                                                                          const size = Number(req.body.groupSize);
                                                                                                                                                                                                                                                                            if (!size || size < 1) return res.status(400).json({ error: "Tamaño inválido" });
                                                                                                                                                                                                                                                                              state.groupSize = size;
                                                                                                                                                                                                                                                                                saveState(state);
                                                                                                                                                                                                                                                                                  broadcast();
                                                                                                                                                                                                                                                                                    res.json({ ok: true });
                                                                                                                                                                                                                                                                                    });
                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                    io.on("connection", (socket) => {
                                                                                                                                                                                                                                                                                      socket.emit("state", publicState());
                                                                                                                                                                                                                                                                                      });
                                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                                      const PORT = process.env.PORT || 3000;
                                                                                                                                                                                                                                                                                      server.listen(PORT, () => {
                                                                                                                                                                                                                                                                                        console.log(`Planes con Habibis corriendo en http://localhost:${PORT}`);
                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                        
