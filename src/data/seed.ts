import { v4 as uuid } from 'uuid'
import type { AppState } from './models'
import { format, addDays, subDays } from 'date-fns'

const today = new Date()
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

export function createSeedData(): Partial<AppState> {
  const mamId = uuid()
  const papId = uuid()
  const kid1Id = uuid()
  const kid2Id = uuid()
  const listId = uuid()

  return {
    members: [
      { id: mamId, name: 'Mama', role: 'admin', color: '#6366f1', emoji: '👩', createdAt: new Date().toISOString() },
      { id: papId, name: 'Papa', role: 'parent', color: '#0ea5e9', emoji: '👨', createdAt: new Date().toISOString() },
      { id: kid1Id, name: 'Lena', role: 'child', color: '#ec4899', emoji: '👧', pin: '1234', createdAt: new Date().toISOString() },
      { id: kid2Id, name: 'Max', role: 'child', color: '#f59e0b', emoji: '👦', pin: '5678', createdAt: new Date().toISOString() },
    ],
    events: [
      {
        id: uuid(), title: 'Arzttermin Lena', description: 'Vorsorge',
        startDate: fmt(addDays(today, 2)), allDay: false,
        startTime: '09:30', endTime: '10:00',
        category: 'doctor', memberIds: [kid1Id], location: 'Praxis Dr. Müller',
      },
      {
        id: uuid(), title: 'Familienausflug', description: 'Ins Freibad',
        startDate: fmt(addDays(today, 5)), allDay: true,
        category: 'family', memberIds: [mamId, papId, kid1Id, kid2Id],
      },
      {
        id: uuid(), title: 'Schulfest', description: 'Grundschule Am Park',
        startDate: fmt(addDays(today, 3)), allDay: false,
        startTime: '14:00', endTime: '17:00',
        category: 'school', memberIds: [kid1Id, kid2Id], location: 'Schule',
      },
      {
        id: uuid(), title: 'Fußballtraining Max',
        startDate: fmt(today), allDay: false,
        startTime: '16:00', endTime: '17:30',
        category: 'sport', memberIds: [kid2Id], location: 'Sportplatz',
      },
    ],
    scheduleLessons: [
      // Lena - Klasse 3
      { id: uuid(), memberId: kid1Id, dayOfWeek: 0, period: 1, subject: 'Deutsch', teacher: 'Fr. Wagner', room: '12', color: '#6366f1' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 0, period: 2, subject: 'Mathe', teacher: 'Hr. Klein', room: '12', color: '#0ea5e9' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 0, period: 3, subject: 'Sachkunde', teacher: 'Fr. Wagner', room: '12', color: '#10b981' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 0, period: 4, subject: 'Sport', teacher: 'Hr. Braun', room: 'Halle', color: '#f59e0b' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 1, period: 1, subject: 'Mathe', teacher: 'Hr. Klein', room: '12', color: '#0ea5e9' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 1, period: 2, subject: 'Deutsch', teacher: 'Fr. Wagner', room: '12', color: '#6366f1' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 1, period: 3, subject: 'Englisch', teacher: 'Fr. Bauer', room: '12', color: '#ec4899' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 2, period: 1, subject: 'Kunst', teacher: 'Fr. Hoffmann', room: 'Kunstraum', color: '#a855f7' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 2, period: 2, subject: 'Musik', teacher: 'Hr. Schulz', room: 'Musikraum', color: '#14b8a6' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 3, period: 1, subject: 'Deutsch', teacher: 'Fr. Wagner', room: '12', color: '#6366f1' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 3, period: 2, subject: 'Mathe', teacher: 'Hr. Klein', room: '12', color: '#0ea5e9' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 4, period: 1, subject: 'Religion', teacher: 'Fr. Meyer', room: '8', color: '#f97316' },
      { id: uuid(), memberId: kid1Id, dayOfWeek: 4, period: 2, subject: 'Sachkunde', teacher: 'Fr. Wagner', room: '12', color: '#10b981' },
      // Max - Klasse 2
      { id: uuid(), memberId: kid2Id, dayOfWeek: 0, period: 1, subject: 'Deutsch', teacher: 'Hr. Fischer', room: '7', color: '#6366f1' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 0, period: 2, subject: 'Mathe', teacher: 'Hr. Fischer', room: '7', color: '#0ea5e9' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 0, period: 3, subject: 'Sport', teacher: 'Hr. Braun', room: 'Halle', color: '#f59e0b' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 1, period: 1, subject: 'Mathe', teacher: 'Hr. Fischer', room: '7', color: '#0ea5e9' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 1, period: 2, subject: 'Deutsch', teacher: 'Hr. Fischer', room: '7', color: '#6366f1' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 2, period: 1, subject: 'Kunst', teacher: 'Fr. Hoffmann', room: 'Kunstraum', color: '#a855f7' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 3, period: 1, subject: 'Deutsch', teacher: 'Hr. Fischer', room: '7', color: '#6366f1' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 3, period: 2, subject: 'Mathe', teacher: 'Hr. Fischer', room: '7', color: '#0ea5e9' },
      { id: uuid(), memberId: kid2Id, dayOfWeek: 4, period: 1, subject: 'Musik', teacher: 'Hr. Schulz', room: 'Musikraum', color: '#14b8a6' },
    ],
    shoppingLists: [
      { id: listId, name: 'Einkauf', isActive: true, createdAt: new Date().toISOString() },
    ],
    shoppingItems: [
      { id: uuid(), listId, name: 'Milch', quantity: '2L', category: 'Milchprodukte', checked: false, createdAt: new Date().toISOString() },
      { id: uuid(), listId, name: 'Eier', quantity: '10 Stück', category: 'Milchprodukte', checked: false, createdAt: new Date().toISOString() },
      { id: uuid(), listId, name: 'Brot', quantity: '1 Laib', category: 'Backwaren', checked: true, createdAt: new Date().toISOString() },
      { id: uuid(), listId, name: 'Äpfel', quantity: '1kg', category: 'Obst & Gemüse', checked: false, createdAt: new Date().toISOString() },
      { id: uuid(), listId, name: 'Joghurt', quantity: '4x', category: 'Milchprodukte', checked: false, createdAt: new Date().toISOString() },
      { id: uuid(), listId, name: 'Nudeln', quantity: '500g', category: 'Grundnahrung', checked: false, createdAt: new Date().toISOString() },
    ],
    meals: [
      { id: uuid(), name: 'Spaghetti Bolognese', category: 'lunch', tags: ['Pasta', 'Klassiker'], favorite: true, lastCooked: fmt(subDays(today, 5)), createdAt: new Date().toISOString() },
      { id: uuid(), name: 'Pfannkuchen', category: 'breakfast', tags: ['Kinderliebling', 'Schnell'], favorite: true, createdAt: new Date().toISOString() },
      { id: uuid(), name: 'Gemüsesuppe', category: 'lunch', tags: ['Gesund', 'Vegetarisch'], favorite: false, createdAt: new Date().toISOString() },
      { id: uuid(), name: 'Pizza', category: 'dinner', tags: ['Kinderliebling', 'Freitag'], favorite: true, lastCooked: fmt(subDays(today, 3)), createdAt: new Date().toISOString() },
      { id: uuid(), name: 'Schnitzel mit Kartoffeln', category: 'lunch', tags: ['Klassiker'], favorite: false, createdAt: new Date().toISOString() },
      { id: uuid(), name: 'Obst-Smoothie', category: 'snack', tags: ['Gesund', 'Schnell'], favorite: false, createdAt: new Date().toISOString() },
    ],
    recipes: [
      {
        id: uuid(), title: 'Spaghetti Bolognese',
        description: 'Das Klassiker-Rezept für die ganze Familie',
        ingredients: [
          { id: uuid(), name: 'Hackfleisch', amount: '500', unit: 'g' },
          { id: uuid(), name: 'Spaghetti', amount: '400', unit: 'g' },
          { id: uuid(), name: 'Tomaten (Dose)', amount: '2', unit: 'Dosen' },
          { id: uuid(), name: 'Zwiebel', amount: '1', unit: 'Stück' },
          { id: uuid(), name: 'Knoblauch', amount: '2', unit: 'Zehen' },
          { id: uuid(), name: 'Olivenöl', amount: '3', unit: 'EL' },
        ],
        steps: [
          'Zwiebeln und Knoblauch fein hacken.',
          'Olivenöl erhitzen, Zwiebeln glasig andünsten.',
          'Hackfleisch dazugeben und scharf anbraten.',
          'Tomaten und Knoblauch dazugeben, 30 Min köcheln.',
          'Spaghetti nach Packungsanweisung kochen.',
          'Alles vermengen, mit Parmesan servieren.',
        ],
        prepTime: 10, cookTime: 35, servings: 4,
        tags: ['Pasta', 'Klassiker', 'Familie'],
        createdAt: new Date().toISOString(),
      },
    ],
    mealWishes: [
      { id: uuid(), memberId: kid1Id, name: 'Tacos', emoji: '🌮', status: 'wished', createdAt: new Date().toISOString() },
      { id: uuid(), memberId: kid2Id, name: 'Hotdog', emoji: '🌭', status: 'planned', createdAt: new Date().toISOString() },
      { id: uuid(), memberId: kid1Id, name: 'Pancakes', emoji: '🥞', status: 'cooked', createdAt: new Date().toISOString() },
    ],
    mealPlans: [
      { id: uuid(), date: fmt(today), mealType: 'lunch', customName: 'Gemüsesuppe' },
      { id: uuid(), date: fmt(today), mealType: 'dinner', customName: 'Pizza' },
      { id: uuid(), date: fmt(addDays(today, 1)), mealType: 'lunch', customName: 'Spaghetti Bolognese' },
    ],
    settings: {
      familyName: 'Familie',
      kidsBoardUrl: 'http://192.168.20.211/kinderboard/',
      kidsBoardMode: 'iframe',
      theme: 'light',
      activeModules: ['dashboard', 'calendar', 'timetable', 'shopping', 'meals', 'recipes', 'wishes', 'kids', 'kidsboard'],
    },
  }
}
