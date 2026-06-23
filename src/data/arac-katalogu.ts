// Araç kayıt formu için statik katalog: araç cinsleri + marka/model listesi.
// Listede olmayan marka/model serbest metin olarak da girilebilir
// (AutocompleteInput filtreler ama dayatmaz).

export const ARAC_CINSLERI = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'suv', label: 'SUV' },
  { value: 'crossover', label: 'Crossover' },
  { value: 'station_wagon', label: 'Station Wagon' },
  { value: 'mpv', label: 'MPV' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'cabrio', label: 'Cabrio' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'panelvan', label: 'Panelvan' },
] as const;

export type AracCinsi = (typeof ARAC_CINSLERI)[number]['value'];

export function cinsLabel(value: string | null): string {
  return ARAC_CINSLERI.find(c => c.value === value)?.label ?? '—';
}

// Fiyatlama segmentleri (araç boyut sınıfı). vehicles.segment trigger ile
// arac_cinsi'den otomatik atanır; burası sadece etiket/sıra için.
export const SEGMENTLER = [
  { value: 'kucuk', label: 'Küçük araç' },
  { value: 'buyuk', label: 'Büyük araç' },
] as const;

export type Segment = (typeof SEGMENTLER)[number]['value'];

// Büyük sayılan cinsler (migration'daki arac_segment ile aynı tutulmalı)
const BUYUK_CINSLER = new Set([
  'suv', 'crossover', 'station_wagon', 'mpv', 'pickup', 'panelvan',
]);

export function aracSegment(cinsi: string | null): Segment {
  return cinsi && BUYUK_CINSLER.has(cinsi) ? 'buyuk' : 'kucuk';
}

export function segmentLabel(value: string): string {
  return SEGMENTLER.find(s => s.value === value)?.label ?? value;
}

// Marka → modeller. Alfabetik sıralı.
export const MARKALAR: Record<string, string[]> = {
  'Alfa Romeo': ['147', '156', '159', 'Giulia', 'Giulietta', 'Junior', 'MiTo', 'Stelvio', 'Tonale'],
  'Aston Martin': ['DB11', 'DB12', 'DBX', 'Vantage'],
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'e-tron GT', 'TT', 'R8'],
  'BMW': ['1 Serisi', '2 Serisi', '3 Serisi', '4 Serisi', '5 Serisi', '6 Serisi', '7 Serisi', '8 Serisi', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'i4', 'i5', 'i7', 'iX', 'iX1', 'iX3', 'Z4', 'M2', 'M3', 'M4', 'M5'],
  'BYD': ['Atto 3', 'Dolphin', 'Han', 'Seal', 'Seal U', 'Sealion 7', 'Tang'],
  'Bentley': ['Bentayga', 'Continental GT', 'Flying Spur'],
  'Chery': ['Arrizo 5', 'Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro'],
  'Chevrolet': ['Aveo', 'Camaro', 'Captiva', 'Corvette', 'Cruze', 'Kalos', 'Lacetti', 'Spark', 'Trax'],
  'Citroën': ['Berlingo', 'C-Elysée', 'C1', 'C2', 'C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 Aircross', 'C5 X', 'Jumper', 'Jumpy', 'Nemo', 'Saxo', 'Xsara', 'ë-C4'],
  'Cupra': ['Ateca', 'Born', 'Formentor', 'Leon', 'Tavascan', 'Terramar'],
  'DS': ['DS 3', 'DS 4', 'DS 7', 'DS 9'],
  'Dacia': ['Bigster', 'Dokker', 'Duster', 'Jogger', 'Lodgy', 'Logan', 'Sandero', 'Sandero Stepway', 'Spring'],
  'Daihatsu': ['Materia', 'Sirion', 'Terios'],
  'Dodge': ['Challenger', 'Charger', 'Nitro'],
  'Ferrari': ['296', '488', 'F8', 'Purosangue', 'Roma', 'SF90'],
  'Fiat': ['500', '500L', '500X', 'Albea', 'Brava', 'Bravo', 'Doblo', 'Ducato', 'Egea', 'Egea Cross', 'Fiorino', 'Freemont', 'Linea', 'Marea', 'Palio', 'Panda', 'Punto', 'Scudo', 'Siena', 'Tempra', 'Tipo', 'Uno'],
  'Ford': ['B-Max', 'C-Max', 'Connect', 'Courier', 'EcoSport', 'Edge', 'Escort', 'Fiesta', 'Focus', 'Fusion', 'Galaxy', 'Kuga', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Ranger', 'S-Max', 'Taunus', 'Tourneo Courier', 'Tourneo Custom', 'Transit', 'Transit Custom'],
  'Honda': ['Accord', 'CR-V', 'City', 'Civic', 'HR-V', 'Jazz', 'ZR-V', 'e:Ny1'],
  'Hyundai': ['Accent', 'Accent Blue', 'Bayon', 'Elantra', 'Getz', 'IONIQ 5', 'IONIQ 6', 'Kona', 'Santa Fe', 'Staria', 'Tucson', 'i10', 'i20', 'i30', 'ix35'],
  'Isuzu': ['D-Max'],
  'Iveco': ['Daily'],
  'Jaecoo': ['7'],
  'Jaguar': ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF', 'XJ'],
  'Jeep': ['Avenger', 'Cherokee', 'Compass', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  'KGM (SsangYong)': ['Actyon', 'Korando', 'Kyron', 'Musso', 'Rexton', 'Tivoli', 'Torres'],
  'Kia': ['Carnival', 'Ceed', 'Cerato', 'EV6', 'EV9', 'Niro', 'Picanto', 'Rio', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Stonic', 'Venga'],
  'Lada': ['Granta', 'Kalina', 'Niva', 'Samara', 'Vega', 'Vesta'],
  'Lamborghini': ['Aventador', 'Huracan', 'Revuelto', 'Urus'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  'Leapmotor': ['C10', 'T03'],
  'Lexus': ['CT', 'ES', 'GX', 'IS', 'LBX', 'LM', 'LS', 'NX', 'RX', 'UX'],
  'MG': ['3', '4', '5', 'EHS', 'HS', 'Marvel R', 'ZS'],
  'Maserati': ['Ghibli', 'Grecale', 'Levante', 'MC20', 'Quattroporte'],
  'Mazda': ['2', '3', '323', '6', '626', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-30', 'MX-5'],
  'McLaren': ['720S', 'Artura', 'GT'],
  'Mercedes-Benz': ['A-Serisi', 'B-Serisi', 'C-Serisi', 'CLA', 'CLS', 'Citan', 'E-Serisi', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'G-Serisi', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S-Serisi', 'SL', 'Sprinter', 'Vito'],
  'Mini': ['Aceman', 'Clubman', 'Cooper', 'Countryman', 'One'],
  'Mitsubishi': ['ASX', 'Attrage', 'Carisma', 'Colt', 'Eclipse Cross', 'L200', 'Lancer', 'Outlander', 'Pajero', 'Space Star'],
  'Nissan': ['Almera', 'Juke', 'Leaf', 'Micra', 'Navara', 'Note', 'Pathfinder', 'Primera', 'Qashqai', 'X-Trail'],
  'Omoda': ['5', 'E5'],
  'Opel': ['Astra', 'Combo', 'Corsa', 'Crossland', 'Frontera', 'Grandland', 'Insignia', 'Meriva', 'Mokka', 'Movano', 'Vectra', 'Vivaro', 'Zafira'],
  'Peugeot': ['106', '206', '207', '208', '2008', '301', '306', '307', '308', '3008', '407', '408', '5008', '508', 'Bipper', 'Boxer', 'Expert', 'Partner', 'Rifter', 'e-208', 'e-2008'],
  'Porsche': ['718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Renault': ['Austral', 'Captur', 'Clio', 'Espace', 'Express', 'Fluence', 'Kadjar', 'Kangoo', 'Koleos', 'Laguna', 'Master', 'Megane', 'Megane E-Tech', 'Symbol', 'Taliant', 'Talisman', 'Toros', 'Trafic', 'Twingo', 'Zoe'],
  'Rolls-Royce': ['Cullinan', 'Ghost', 'Phantom', 'Spectre', 'Wraith'],
  'Seat': ['Alhambra', 'Altea', 'Arona', 'Ateca', 'Cordoba', 'Ibiza', 'Leon', 'Tarraco', 'Toledo'],
  'Seres': ['3', '5'],
  'Skoda': ['Enyaq', 'Fabia', 'Favorit', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia', 'Rapid', 'Scala', 'Superb', 'Yeti'],
  'Skywell': ['ET5'],
  'Smart': ['#1', '#3', 'ForFour', 'ForTwo'],
  'Subaru': ['BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Levorg', 'Outback', 'Solterra', 'XV'],
  'Suzuki': ['Alto', 'Baleno', 'Celerio', 'Grand Vitara', 'Ignis', 'Jimny', 'S-Cross', 'SX4', 'Splash', 'Swift', 'Vitara'],
  'Tesla': ['Cybertruck', 'Model 3', 'Model S', 'Model X', 'Model Y'],
  'Tofaş': ['Doğan', 'Kartal', 'Serçe', 'Şahin'],
  'Togg': ['T10F', 'T10X'],
  'Toyota': ['Auris', 'Avensis', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'Hilux', 'Land Cruiser', 'Prius', 'Proace', 'Proace City', 'RAV4', 'Supra', 'Yaris', 'Yaris Cross', 'bZ4X'],
  'Volkswagen': ['Amarok', 'Arteon', 'Beetle', 'Bora', 'Caddy', 'Caravelle', 'Golf', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'Jetta', 'Passat', 'Polo', 'Scirocco', 'T-Cross', 'T-Roc', 'Taigo', 'Tiguan', 'Touareg', 'Touran', 'Transporter'],
  'Volvo': ['C40', 'EX30', 'EX90', 'S40', 'S60', 'S80', 'S90', 'V40', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
};

export const MARKA_ADLARI = Object.keys(MARKALAR);

// Türkçe karakter duyarsız "içerir" filtresi (İ/i, I/ı sorunsuz)
export function filtrele(liste: string[], aranan: string): string[] {
  const a = aranan.trim().toLocaleLowerCase('tr');
  if (!a) return liste;
  return liste.filter(item => item.toLocaleLowerCase('tr').includes(a));
}
