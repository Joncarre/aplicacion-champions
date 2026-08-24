import { madridDayNumber } from '@/lib/date'

/**
 * Curiosidades de la Champions. En el perfil se muestra una distinta cada día,
 * la misma para todos los participantes.
 */
export const CHAMPIONS_FACTS: string[] = [
  'La competición nació en la temporada 1955-1956 con el nombre de Copa de Europa de Clubes Campeones. Inicialmente solo participaban los campeones de las ligas nacionales.',
  'La idea de crearla fue impulsada por el periodista francés Gabriel Hanot, de la revista L’Équipe.',
  'El primer partido de la historia enfrentó al Sporting de Lisboa y al Partizan de Belgrado el 4 de septiembre de 1955. Terminó con empate 3-3.',
  'La primera final se disputó en 1956. El Real Madrid derrotó al Stade de Reims por 4-3 y se convirtió en el primer campeón.',
  'El Real Madrid es el club que más veces ha ganado la máxima competición europea. Ha conquistado 15 títulos entre la Copa de Europa y la Champions League.',
  'El Real Madrid ganó las cinco primeras ediciones consecutivas, entre 1956 y 1960. Es una racha que ningún otro equipo ha igualado.',
  'La competición pasó a llamarse oficialmente UEFA Champions League en la temporada 1992-1993, cuando se introdujeron cambios importantes en el formato y en la identidad comercial del torneo.',
  'El trofeo es conocido popularmente como “la Orejona” por la forma de sus grandes asas.',
  'El récord del gol más rápido en la Champions pertenece a Roy Makaay. Marcó para el Bayern de Múnich contra el Real Madrid después de aproximadamente 10,12 segundos, en 2007.',
  'Patrick Kluivert es el jugador más joven en marcar en una final. Lo hizo con el Ajax contra el Milan en 1995, con 18 años y 327 días.',
  'Ansu Fati es el futbolista más joven en marcar en la historia de la Champions League. Lo consiguió con el Barcelona frente al Inter de Milán en 2019.',
  'La final con más goles de toda la historia fue la de 1960, cuando el Real Madrid venció al Eintracht de Frankfurt por 7-3: diez goles en total.',
  'La final moderna más goleadora fue la de 2005, conocida como el “Milagro de Estambul”. Liverpool y Milan empataron 3-3, antes de que el Liverpool ganara en los penaltis.',
  'En aquella final de 2005, el Milan ganaba 3-0 al descanso, pero el Liverpool empató en apenas seis minutos durante la segunda parte.',
  'El partido con más goles en la era de la Champions League terminó Borussia Dortmund 8-4 Legia de Varsovia, en 2016. Se marcaron doce tantos.',
  'Cristiano Ronaldo es el máximo goleador histórico de la Champions League, por delante de Lionel Messi. También posee varios récords relacionados con goles en fases eliminatorias y finales.',
  'Cristiano Ronaldo es uno de los pocos jugadores que ha marcado en tres finales distintas de la Champions League.',
  'Clarence Seedorf es el único futbolista que ha ganado la Champions League con tres clubes diferentes: Ajax, Real Madrid y Milan.',
  'Seedorf ganó sus títulos en tres décadas distintas: 1995, 1998, 2003 y 2007.',
  'El entrenador con más títulos en la competición es Carlo Ancelotti, que ha levantado el trofeo en varias ocasiones con Milan y Real Madrid.',
  'El himno de la Champions está basado en una adaptación de “Zadok the Priest”, una obra compuesta por Georg Friedrich Händel en 1727.',
  'El himno oficial utiliza tres idiomas: inglés, francés y alemán, aunque la melodía se ha convertido en uno de los sonidos más reconocibles del fútbol.',
  'El balón de la competición suele llevar el diseño de estrellas, inspirado en el logotipo de la Champions League.',
  'Algunos equipos han utilizado la misma camiseta durante una temporada europea completa sin publicidad comercial, debido a las normas históricas de la competición.',
  'La UEFA conserva el trofeo original. Los clubes campeones reciben una réplica, aunque las normas históricas permitieron conservar una copia especial tras ganar cinco veces o tres ediciones consecutivas.',
  'El Benfica perdió dos finales consecutivas en 1963 y 1965, mientras que la Juventus ha sido uno de los clubes con más derrotas en finales.',
  'El Barcelona remontó una eliminatoria histórica contra el Paris Saint-Germain en 2017. Tras perder 4-0 en París, ganó 6-1 en Barcelona y avanzó con un global de 6-5.',
  'El Liverpool protagonizó otra remontada memorable en 2019. Después de perder 3-0 contra el Barcelona, venció por 4-0 en Anfield y alcanzó la final.',
  'La final de 1986 entre Steaua de Bucarest y Barcelona se decidió en los penaltis. El portero rumano Helmuth Duckadam detuvo los cuatro lanzamientos del Barcelona.',
  'En 2008, el Manchester United y el Chelsea disputaron una final completamente inglesa en Moscú. El Manchester United ganó en los penaltis tras un empate 1-1.',
  'La final de 2014 fue la primera entre Real Madrid y Atlético de Madrid. El Real Madrid remontó el partido en la prórroga y ganó por 4-1.',
  'El Atlético de Madrid también perdió la final de 2016 frente al Real Madrid en una tanda de penaltis.',
  'El Arsenal mantuvo durante 995 minutos consecutivos su portería imbatida en la Champions entre 2005 y 2006.',
  'El Liverpool logró una de las mayores goleadas de la competición al vencer 8-0 al Besiktas en 2007.',
  'La competición ha cambiado varias veces su formato: pasó de ser un torneo exclusivamente para campeones nacionales a admitir varios clubes de las ligas más fuertes de Europa.',
  'Desde la temporada 2024-2025 se utiliza un formato de liga única, en lugar de la tradicional fase de grupos. Cada equipo disputa una serie de partidos contra rivales diferentes y la clasificación determina el acceso a las eliminatorias.',
  'La Champions no siempre se ha jugado con una final a partido único en el mismo formato actual. Sus fases, número de participantes y sistema de clasificación han evolucionado notablemente desde 1955.',
  'Ganar la Champions no garantiza dominar la liga nacional: algunos campeones europeos tuvieron temporadas domésticas discretas, mientras que otros completaron temporadas históricas ganando varios títulos.',
  'La Champions League es una continuación histórica de la Copa de Europa, por lo que los récords de ambas competiciones suelen analizarse conjuntamente, aunque la denominación “Champions League” solo se utiliza desde 1992.',
]

/** Curiosidad correspondiente al día de hoy en hora de Madrid. */
export function factOfTheDay(now: number = Date.now()): string {
  const index = ((madridDayNumber(now) % CHAMPIONS_FACTS.length) + CHAMPIONS_FACTS.length) % CHAMPIONS_FACTS.length
  return CHAMPIONS_FACTS[index] ?? CHAMPIONS_FACTS[0] ?? ''
}
