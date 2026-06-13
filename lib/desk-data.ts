import type { Desk } from './types'

/** Initial desk state — mirrors the Supabase seed data exactly */
export const INITIAL_DESKS: Desk[] = [
  // Row A
  { id: 'D01', row: 'A', seat: 1, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: true  },
  { id: 'D02', row: 'A', seat: 2, status: 'occupied',   occupiedSince: '09:45 AM', durationText: '2h 10m', occupantId: '221CS1210',  occupantName: 'Karan J.',   hasPower: true,  isWindow: true  },
  { id: 'D03', row: 'A', seat: 3, status: 'occupied',   occupiedSince: '11:15 AM', durationText: '40m',   occupantId: '221CS1089',  occupantName: 'Monica P.',  hasPower: false, isWindow: true  },
  { id: 'D04', row: 'A', seat: 4, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D05', row: 'A', seat: 5, status: 'away',      occupiedSince: '10:05 AM', durationText: '1h 50m', occupantId: '221CS1140',  occupantName: 'Kriti F.',   hasPower: true,  isWindow: false },
  // Row B
  { id: 'D06', row: 'B', seat: 1, status: 'occupied',   occupiedSince: '08:30 AM', durationText: '3h 25m', occupantId: '221CS1004',  occupantName: 'Rahul D.',   hasPower: true,  isWindow: false },
  { id: 'D07', row: 'B', seat: 2, status: 'abandoned',  occupiedSince: null,       durationText: '3h 14m', occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D08', row: 'B', seat: 3, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D09', row: 'B', seat: 4, status: 'occupied',   occupiedSince: '11:02 AM', durationText: '53m',   occupantId: '221CS1315',  occupantName: 'Tarun L.',   hasPower: false, isWindow: false },
  { id: 'D10', row: 'B', seat: 5, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  // Row C
  { id: 'D11', row: 'C', seat: 1, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D12', row: 'C', seat: 2, status: 'occupied',   occupiedSince: '09:15 AM', durationText: '2h 40m', occupantId: '221CS1090',  occupantName: 'Vikram S.',  hasPower: true,  isWindow: false },
  { id: 'D13', row: 'C', seat: 3, status: 'occupied',   occupiedSince: '10:48 AM', durationText: '1h 07m', occupantId: '221CS1242',  occupantName: 'Shaila K.',  hasPower: false, isWindow: false },
  { id: 'D14', row: 'C', seat: 4, status: 'occupied',   occupiedSince: '10:32 AM', durationText: '1h 23m', occupantId: '221CS1034',  occupantName: 'Aneesh S.',  hasPower: true,  isWindow: false },
  { id: 'D15', row: 'C', seat: 5, status: 'away',      occupiedSince: '11:14 AM', durationText: '0h 18m', occupantId: '221CS1089',  occupantName: 'Priya M.',   hasPower: true,  isWindow: false },
  // Row D
  { id: 'D16', row: 'D', seat: 1, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D17', row: 'D', seat: 2, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D18', row: 'D', seat: 3, status: 'occupied',   occupiedSince: '09:00 AM', durationText: '2h 55m', occupantId: '221CS1330',  occupantName: 'Nikhil R.',  hasPower: false, isWindow: false },
  { id: 'D19', row: 'D', seat: 4, status: 'abandoned',  occupiedSince: null,       durationText: '2h 47m', occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D20', row: 'D', seat: 5, status: 'occupied',   occupiedSince: '10:35 AM', durationText: '1h 20m', occupantId: '221CS1019',  occupantName: 'Aishwarya Y.', hasPower: true, isWindow: false },
  // Row E
  { id: 'D21', row: 'E', seat: 1, status: 'occupied',   occupiedSince: '08:45 AM', durationText: '3h 10m', occupantId: '221CS1023',  occupantName: 'Suresh A.',  hasPower: true,  isWindow: false },
  { id: 'D22', row: 'E', seat: 2, status: 'occupied',   occupiedSince: '10:58 AM', durationText: '0h 57m', occupantId: '221CS1156',  occupantName: 'Rohan K.',   hasPower: true,  isWindow: false },
  { id: 'D23', row: 'E', seat: 3, status: 'occupied',   occupiedSince: '11:22 AM', durationText: '33m',   occupantId: '221CS1204',  occupantName: 'Sanjay H.',  hasPower: false, isWindow: false },
  { id: 'D24', row: 'E', seat: 4, status: 'occupied',   occupiedSince: '10:50 AM', durationText: '1h 05m', occupantId: '221CS1204',  occupantName: 'Deepak T.',  hasPower: true,  isWindow: false },
  { id: 'D25', row: 'E', seat: 5, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  // Row F
  { id: 'D26', row: 'F', seat: 1, status: 'occupied',   occupiedSince: '09:30 AM', durationText: '2h 25m', occupantId: '221CS1080',  occupantName: 'Divya P.',   hasPower: true,  isWindow: false },
  { id: 'D27', row: 'F', seat: 2, status: 'away',      occupiedSince: '11:40 AM', durationText: '0h 13m', occupantId: '221CS1201',  occupantName: 'Sneha T.',   hasPower: true,  isWindow: false },
  { id: 'D28', row: 'F', seat: 3, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: false, isWindow: false },
  { id: 'D29', row: 'F', seat: 4, status: 'occupied',   occupiedSince: '11:00 AM', durationText: '55m',   occupantId: '221CS1215',  occupantName: 'Harsha V.',  hasPower: true,  isWindow: false },
  { id: 'D30', row: 'F', seat: 5, status: 'occupied',   occupiedSince: '08:15 AM', durationText: '3h 40m', occupantId: '221CS1012',  occupantName: 'Sania M.',   hasPower: true,  isWindow: false },
  // Row G
  { id: 'D31', row: 'G', seat: 1, status: 'occupied',   occupiedSince: '09:45 AM', durationText: '2h 10m', occupantId: '221CS1312',  occupantName: 'Arjun V.',   hasPower: true,  isWindow: false },
  { id: 'D32', row: 'G', seat: 2, status: 'occupied',   occupiedSince: '10:10 AM', durationText: '1h 45m', occupantId: '221CS1144',  occupantName: 'Gaurav K.',  hasPower: true,  isWindow: false },
  { id: 'D33', row: 'G', seat: 3, status: 'occupied',   occupiedSince: '10:28 AM', durationText: '1h 27m', occupantId: '221CS1298',  occupantName: 'Neeti F.',   hasPower: false, isWindow: false },
  { id: 'D34', row: 'G', seat: 4, status: 'free',      occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D35', row: 'G', seat: 5, status: 'occupied',   occupiedSince: '11:18 AM', durationText: '37m',   occupantId: '221CS1388',  occupantName: 'Karthik N.', hasPower: true,  isWindow: false },
  // Row H
  { id: 'D36', row: 'H', seat: 1, status: 'occupied',   occupiedSince: '09:05 AM', durationText: '2h 50m', occupantId: '221CS1050',  occupantName: 'Bhavna J.',  hasPower: true,  isWindow: false },
  { id: 'D37', row: 'H', seat: 2, status: 'maintenance',occupiedSince: null,       durationText: null,    occupantId: null,        occupantName: null,         hasPower: true,  isWindow: false },
  { id: 'D38', row: 'H', seat: 3, status: 'occupied',   occupiedSince: '11:02 AM', durationText: '0h 53m', occupantId: '221CS1445',  occupantName: 'Meera R.',   hasPower: false, isWindow: false },
  { id: 'D39', row: 'H', seat: 4, status: 'occupied',   occupiedSince: '10:12 AM', durationText: '1h 43m', occupantId: '221CS1302',  occupantName: 'Vinod P.',   hasPower: true,  isWindow: false },
  { id: 'D40', row: 'H', seat: 5, status: 'occupied',   occupiedSince: '08:55 AM', durationText: '3h 00m', occupantId: '221CS1111',  occupantName: 'Pranav K.',  hasPower: true,  isWindow: false },
]
