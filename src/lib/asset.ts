/** Pfad zu einer Datei aus public/, funktioniert auch unter einem Base-Path (z. B. GitHub Pages). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
