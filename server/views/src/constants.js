export const ZONE_COLORS = [
  'rgba(34,211,238,0.45)',
  'rgba(249,115,22,0.45)',
  'rgba(168,85,247,0.45)',
  'rgba(244,63,94,0.45)',
  'rgba(132,204,22,0.45)',
];

export const DAY_OPTIONS = [
  { id: 'monday', label: 'Lun' },
  { id: 'tuesday', label: 'Mar' },
  { id: 'wednesday', label: 'Mer' },
  { id: 'thursday', label: 'Jeu' },
  { id: 'friday', label: 'Ven' },
  { id: 'saturday', label: 'Sam' },
  { id: 'sunday', label: 'Dim' },
];

export const ORIENTATIONS = [
  { id: 'landscape-left', icon: '\u{1F5B5}', label: 'Paysage' },
  { id: 'landscape-right', icon: '\u{1F5B5}', label: 'Paysage inverse' },
  { id: 'portrait-up', icon: '\u{1F4F1}', label: 'Portrait' },
  { id: 'portrait-down', icon: '\u{1F4F1}', label: 'Portrait inverse' },
];

// Widgets spéciaux sans route API — toujours disponibles
export const SPECIAL_WIDGETS = [
  { type: 'messages', label: 'Messages defilants', icon: '\u{1F4AC}' },
];
// Les widgets data sont chargés dynamiquement depuis /api/widgets (AppContext.widgets)
