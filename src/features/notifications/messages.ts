/**
 * Daily reminder messages — Uruguayan informal tone.
 * `normal`: amable, leve puteo. `vialli`: máximo puteo, opt-in.
 */
export type NotificationTone = "normal" | "vialli";

const NORMAL_MESSAGES: { title: string; body: string }[] = [
    { title: "Che, ¿registraste hoy?", body: "Llevá la cuenta antes de que se te escape el mes 💸" },
    { title: "Bo, no te olvides", body: "Anotá los gastos del día, dale" },
    { title: "Recordatorio del día", body: "¿En qué gastaste hoy? Anotalo antes de irte a dormir" },
    { title: "Hola crack", body: "Pasá un minuto y registrá los movimientos de hoy" },
    { title: "Recordatorio amistoso", body: "El presupuesto no se cuida solo, anotá lo del día" },
    { title: "¿Cómo viene el día?", body: "Si gastaste algo, dejalo registrado ahora" },
    { title: "Antes de cerrar el día", body: "Anotá los gastos para no perderte" },
    { title: "Che, llegó la hora", body: "Movimientos del día → al toque los anotás" },
];

const VIALLI_MESSAGES: { title: string; body: string }[] = [
    { title: "Che gil", body: "No registraste un mango hoy, dale movete" },
    { title: "Bo, te dormiste", body: "Anotá los gastos del día, no te hagás el boludo" },
    { title: "Eh nene", body: "El presupuesto no se cuida solo, registrá los gastos YA" },
    { title: "Pero qué te pasa", body: "¿Vas a dejar el día sin anotar? Sos un caso" },
    { title: "Mirá vos", body: "Otro día sin registrar nada. Andá, dale, no jodas" },
    { title: "Loco", body: "Anotá los gastos del día o te quedás sin plata sin saber por qué" },
    { title: "Salí del WhatsApp", body: "Y anotá los movimientos del día, gil" },
    { title: "Aguante el control", body: "Pero solo si lo hacés. Anotá YA los gastos" },
];

/** Pick a deterministic message based on date — same day = same message,
 *  so canceling/rescheduling doesn't keep rotating randomly. */
export function pickMessage(tone: NotificationTone, date: Date = new Date()) {
    const pool = tone === "vialli" ? VIALLI_MESSAGES : NORMAL_MESSAGES;
    const dayOfYear = Math.floor(
        (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return pool[dayOfYear % pool.length];
}
