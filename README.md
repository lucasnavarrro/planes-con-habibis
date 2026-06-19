# Planes con Habibis

App para votar y organizar planes de fiesta en CDMX con tus amigos. Todos pueden sugerir planes, ver el presupuesto estimado por persona y votar por el plan ganador de cada día (Jueves, Viernes, Sábado, Domingo).

## Funciones

- Unirse a la sala con tu nombre
- - Sugerir planes con cover, consumo promedio y costo de traslado
  - - Votar (un voto por persona por día)
    - - Ver el calendario con el plan ganador de cada día en tiempo real
      - - Sincronizacion en tiempo real entre todos los usuarios (Socket.io)
       
        - ## Correr localmente
       
        - 1. Instalar dependencias: npm install
          2. 2. Iniciar el servidor: npm start
             3. 3. Abrir http://localhost:3000
               
                4. ## Desplegar en Render.com
               
                5. 1. Crear cuenta en https://render.com y conectar tu repo de GitHub
                   2. 2. Crear un nuevo Web Service apuntando a este repo
                      3. 3. Build Command: npm install
                         4. 4. Start Command: node server.js
                            5. 5. Plan: Free
                              
                               6. Nota: en el plan gratuito de Render el disco es efimero, asi que los votos se reinician si el servicio se reinicia por inactividad.
                               7. 
