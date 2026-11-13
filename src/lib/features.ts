/**
 * Feature-Flags, gesteuert über Build-Variablen.
 *
 * VITE_ENABLE_ADMIN_PANEL=false blendet die Stationsverwaltung (/admin/stations) aus und lädt keine
 * über das Adminpanel angelegten Pfade/Stationen. Standard: aktiv. Der Release-Build setzt den Wert
 * im GitHub-Workflow – der Code bleibt auf allen Branches identisch.
 */
export const ADMIN_PANEL_ENABLED = import.meta.env.VITE_ENABLE_ADMIN_PANEL !== 'false';
