# Porra Champions 2026/27

Porra privada de la fase liga de la UEFA Champions League. Cada participante pronostica el marcador de los 144
partidos, un administrador va metiendo los resultados reales y la aplicación calcula la clasificación sola.

Pensada para el móvil: navegación con barra inferior, tema oscuro y se puede instalar como aplicación desde el
navegador.

---

## Puesta en marcha

```bash
npm install
npm run dev
```

Se abre en <http://localhost:5173>. **No hace falta configurar nada para empezar**: si no hay credenciales de
Firebase la aplicación arranca en modo demo, guardando todo en el navegador y sembrando datos de prueba.

### Probarla en el móvil

`npm run dev` también sirve la app en la IP de tu red local, pero **por ahí no se puede iniciar sesión**: los
navegadores solo dan acceso a `crypto.subtle` —lo que deriva las contraseñas— en contextos seguros, es decir
`localhost` o HTTPS. Para el móvil hay un script aparte:

```bash
npm run dev:https
```

Levanta el servidor con un certificado autofirmado. Abre en el teléfono la URL `https://` que imprime la consola; el
navegador avisará de que el certificado no es de fiar y hay que entrar en *Configuración avanzada* → *Continuar*. A
partir de ahí funciona todo. Si te olvidas y entras por `http://`, la propia aplicación te lo avisa con una banda
amarilla en vez de reventar con un error incomprensible.

### Entrar en el modo demo

| Usuario    | Contraseña  | Qué ves                                       |
| ---------- | ----------- | --------------------------------------------- |
| `joncarre` | `champions` | Participante **y** panel de administración    |
| `lucia`    | `champions` | Participante que va primera en la clasificación |
| `noa`      | `champions` | Participante **sin pagar**: todo bloqueado    |

### Viajar en el tiempo

La competición empieza el 8 de septiembre de 2026, así que con la fecha real no hay ni un partido jugado. Para ver
la aplicación a mitad de temporada, `.env` trae:

```bash
VITE_DEMO_NOW=2026-12-15
```

Con esa fecha las jornadas 1 a 6 aparecen jugadas, la 7 abierta a apuestas y las gráficas del perfil con datos.
Déjalo vacío para usar la fecha real. Cambia el valor, reinicia `npm run dev` y pulsa **Reiniciar datos de
demostración** en el panel de administración (pestaña *Calendario*) para volver a sembrar.

---

## Lo que tienes que hacer tú para pasarlo a Firebase

1. **Crear el proyecto** en <https://console.firebase.google.com>. Con el plan gratuito (Spark) sobra.
2. **Crear la base de datos**: `Firestore Database` → `Crear base de datos` → modo producción → región
   `eur3 (europe-west)`.
3. **Registrar una app web**: `Configuración del proyecto` → `Tus apps` → icono `</>`. Copia el objeto
   `firebaseConfig` que te enseña.
4. **Rellenar `.env`** con esos valores y poner el modo demo a `false`:

   ```bash
   VITE_DEMO_MODE=false
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   VITE_ADMIN_NICKNAME=joncarre
   ```

   `.env` está en `.gitignore`, así que no se sube al repositorio. Aun así, esas credenciales son públicas por
   diseño: lo que protege los datos son las reglas de Firestore, no ocultarlas.

5. **Publicar las reglas** de `firestore.rules`. O desde la consola (`Firestore` → `Reglas`, pegar y publicar), o
   con la CLI:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # elige tu proyecto
   firebase deploy --only firestore:rules
   ```

6. **Registrarte** en la aplicación con el nickname que hayas puesto en `VITE_ADMIN_NICKNAME`. Ese usuario recibe el
   panel de administración automáticamente.
7. **Sembrar la competición**: entra en `Perfil` → `Admin` → pestaña *Calendario* → **Equipos y calendario
   oficiales**. Eso crea los 36 equipos del sorteo y los 144 partidos con sus horarios.

### Desplegar

Ya está configurado para Netlify (`netlify.toml`): conecta el repositorio, pon las variables `VITE_*` en
`Site settings` → `Environment variables` y listo. Cualquier hosting estático vale; solo hace falta redirigir todas
las rutas a `index.html`.

---

## Cómo funciona la porra

### Puntos

| Concepto                      | Puntos |
| ----------------------------- | -----: |
| Acertar el signo (1, X, 2)    |      1 |
| Acertar el marcador exacto    |      3 |
| Acertar el máximo goleador    |     25 |
| Acertar el campeón            |     50 |

El marcador exacto vale 3 puntos **en total**, no 3 además del punto del signo. El máximo por la fase liga son
432 puntos (144 × 3), y 507 contando las dos apuestas especiales.

En la clasificación, la columna **1X2** cuenta los aciertos de signo que no son marcador exacto, de modo que la
tabla cuadra a simple vista: `puntos = 1 × 1X2 + 3 × exactos + especiales`.

### Candados

Hay tres, encadenados:

1. Hasta que el administrador no te marca como **pagado**, no puedes apostar nada.
2. Cada partido se cierra **en el momento del saque inicial**.
3. Solo está abierta la **jornada en curso**: las futuras se ven pero no se tocan. En cuanto arranca el último
   partido de una jornada, se abre la siguiente, así que durante los parones ya se puede ir apostando.

Las apuestas de **máximo goleador y campeón** (en el perfil) se cierran el 8 de septiembre de 2026 a las 00:00.

### Calendario

| Jornada | Fechas             |
| ------- | ------------------ |
| 1       | 8–10 sep 2026      |
| 2       | 13–14 oct 2026     |
| 3       | 20–21 oct 2026     |
| 4       | 3–4 nov 2026       |
| 5       | 24–25 nov 2026     |
| 6       | 8–9 dic 2026       |
| 7       | 19–20 ene 2027     |
| 8       | 27 ene 2027        |

Los 144 enfrentamientos y sus horarios son los oficiales, transcritos en [`src/data/fixtures.ts`](src/data/fixtures.ts).
Si la UEFA mueve algún partido, se corrige uno a uno desde el panel de administración sin tocar el resto.

Todo se guarda como instante absoluto y se muestra en hora de Madrid, así que el cambio de horario sale bien solo:
las jornadas 1 a 3 se juegan en CEST (UTC+2) y de la 4 en adelante en CET (UTC+1).

El calendario está cubierto por [`fixtures.test.ts`](src/data/fixtures.test.ts), que comprueba las reglas del
formato de fase liga: 36 equipos jugando una vez por jornada, 8 rivales distintos cada uno, 4 partidos en casa y 4
fuera, y ningún emparejamiento repetido. Cualquier errata al transcribir rompe alguna de esas comprobaciones.

Fase eliminatoria (la pantalla de *Cruces* todavía está pendiente): play-offs el 16/17 y 23/24 de febrero de 2027,
octavos el 9/10 y 16/17 de marzo, cuartos el 6/7 y 13/14 de abril, semifinales el 27/28 de abril y 4/5 de mayo, y
la final el 5 de junio de 2027.

---

## Tecnologías

- **React 19** + **TypeScript** + **Vite 8**, aplicación de una sola página con **React Router 7**.
- **Tailwind CSS 4** con un sistema de tokens propio en `src/index.css`. Tema oscuro único.
- **Firebase Firestore** como única base de datos, llamada directamente desde el navegador.
- **Vitest** + **Testing Library** para las pruebas.
- Gráficas dibujadas a mano en SVG: son series de ocho puntos, una librería pesaría más que el código.

### Estructura

```
src/
  data/        constantes de la competición: equipos, calendario, curiosidades
  lib/         lógica pura sin React ni Firebase: puntos, clasificaciones, bloqueos, fechas
  services/    acceso a datos (Firestore o modo demo), autenticación, recálculo de puntos
  context/     sesión y datos compartidos
  components/  piezas de interfaz
  pages/       una por pantalla
```

La lógica de negocio vive en `lib/` como funciones puras, así que se puede probar sin montar nada y se reaprovecha
tal cual si algún día cambia el formato del torneo.

### Scripts

```bash
npm run dev        # servidor de desarrollo
npm run build      # comprueba tipos y compila a dist/
npm run preview    # sirve lo compilado
npm test           # 94 pruebas
npm run test:watch # las mismas, en modo vigilancia
```

---

## Sobre la seguridad

La autenticación es a propósito sencilla: los usuarios viven en Firestore, el login es nickname + contraseña y la
sesión es el id del usuario en `localStorage`. No se usa Firebase Auth.

Lo que eso implica, dicho claramente:

- Las contraseñas **no** se guardan en claro: se derivan con PBKDF2 (150 000 iteraciones, SHA-256) y una sal
  distinta por usuario. Quien lea la base de datos no puede iniciar sesión con lo que ve.
- Como contrapartida, **no hay recuperación de contraseña**. El administrador la restablece desde su panel.
- Firestore **no sabe quién escribe**, así que las reglas solo pueden validar la forma de los documentos, no
  distinguir a un participante de otro. Alguien con conocimientos y la URL del proyecto podría modificar apuestas
  ajenas. Para una porra entre amigos es asumible; si esto se abre a gente de fuera, el cambio a hacer es migrar a
  Firebase Auth y reescribir `firestore.rules` sobre `request.auth.uid`.

---

## Pendiente

- **Cruces**: la pantalla de la fase eliminatoria muestra por ahora un aviso con las fechas. Cuando se defina el
  formato de apuestas habrá que añadir el cuadro y que el administrador marque los equipos clasificados.

---

Desarrollado por [Jonathan Carrero](https://github.com/joncarre).
