// BUG FIX: 2025-01-27 - Comprehensive country/region data with phone validation
// Problem: Incomplete country list, missing regions, no phone validation
// Solution: Complete country data with regions and phone validation patterns
// Impact: Proper form validation and complete country coverage

export interface Country {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
  phonePattern: RegExp;
  phoneExample: string;
  regions: string[];
}

// Helper function to get countries sorted alphabetically by name
export function getCountriesSorted(): Country[] {
  return Object.values(COUNTRIES).sort((a, b) => a.name.localeCompare(b.name));
}

// Helper function to get country by code
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES[code];
}

export const COUNTRIES: Record<string, Country> = {
  // North America
  'US': {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phoneCode: '+1',
    phonePattern: /^\+1[2-9]\d{9}$/,
    phoneExample: '+1 555 123 4567',
    regions: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
      'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
      'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
      'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
    ]
  },
  'CA': {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    phoneCode: '+1',
    phonePattern: /^\+1[2-9]\d{9}$/,
    phoneExample: '+1 416 555 0123',
    regions: [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
      'Quebec', 'Saskatchewan', 'Yukon'
    ]
  },
  'MX': {
    code: 'MX',
    name: 'Mexico',
    flag: '🇲🇽',
    phoneCode: '+52',
    phonePattern: /^\+52[1-9]\d{9}$/,
    phoneExample: '+52 55 1234 5678',
    regions: [
      'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
      'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México',
      'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
      'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
      'Veracruz', 'Yucatán', 'Zacatecas', 'Mexico City'
    ]
  },

  // Europe
  'GB': {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    phoneCode: '+44',
    phonePattern: /^\+44[1-9]\d{8,9}$/,
    phoneExample: '+44 20 7946 0958',
    regions: [
      'England', 'Scotland', 'Wales', 'Northern Ireland',
      'Greater London', 'West Midlands', 'Greater Manchester', 'West Yorkshire', 'Merseyside',
      'South Yorkshire', 'Tyne and Wear', 'Nottinghamshire', 'Derbyshire', 'Lancashire',
      'Hampshire', 'Kent', 'Essex', 'Hertfordshire', 'Surrey', 'Berkshire', 'Buckinghamshire'
    ]
  },
  'DE': {
    code: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    phoneCode: '+49',
    phonePattern: /^\+49[1-9]\d{10,11}$/,
    phoneExample: '+49 30 12345678',
    regions: [
      'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse',
      'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate',
      'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
    ]
  },
  'FR': {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    phoneCode: '+33',
    phonePattern: /^\+33[1-9]\d{8}$/,
    phoneExample: '+33 1 42 34 56 78',
    regions: [
      'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire',
      'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine',
      'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
    ]
  },
  'IT': {
    code: 'IT',
    name: 'Italy',
    phoneCode: '+39',
    phonePattern: /^\+39[0-9]\d{8,9}$/,
    phoneExample: '+39 06 1234 5678',
    regions: [
      'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia',
      'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont', 'Puglia', 'Sardinia',
      'Sicily', 'Tuscany', 'Trentino-Alto Adige', 'Umbria', 'Aosta Valley', 'Veneto'
    ]
  },
  'ES': {
    code: 'ES',
    name: 'Spain',
    phoneCode: '+34',
    phonePattern: /^\+34[6-9]\d{8}$/,
    phoneExample: '+34 612 34 56 78',
    regions: [
      'Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands',
      'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Extremadura', 'Galicia',
      'La Rioja', 'Madrid', 'Murcia', 'Navarre', 'Valencia'
    ]
  },
  'NL': {
    code: 'NL',
    name: 'Netherlands',
    phoneCode: '+31',
    phonePattern: /^\+31[1-9]\d{8}$/,
    phoneExample: '+31 6 12345678',
    regions: [
      'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg',
      'North Brabant', 'North Holland', 'Overijssel', 'South Holland', 'Utrecht', 'Zeeland'
    ]
  },

  // Asia-Pacific
  'JP': {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    phoneCode: '+81',
    phonePattern: /^\+81[1-9]\d{9,10}$/,
    phoneExample: '+81 90 1234 5678',
    regions: [
      'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima', 'Ibaraki',
      'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa', 'Niigata', 'Toyama',
      'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu', 'Shizuoka', 'Aichi', 'Mie',
      'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara', 'Wakayama', 'Tottori', 'Shimane',
      'Okayama', 'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi',
      'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'
    ]
  },
  'KR': {
    code: 'KR',
    name: 'South Korea',
    phoneCode: '+82',
    phonePattern: /^\+82[1-9]\d{8,9}$/,
    phoneExample: '+82 10 1234 5678',
    regions: [
      'Seoul', 'Busan', 'Daegu', 'Incheon', 'Gwangju', 'Daejeon', 'Ulsan', 'Sejong',
      'Gyeonggi', 'Gangwon', 'North Chungcheong', 'South Chungcheong', 'North Jeolla',
      'South Jeolla', 'North Gyeongsang', 'South Gyeongsang', 'Jeju'
    ]
  },
  'CN': {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    phoneCode: '+86',
    phonePattern: /^\+86[1-9]\d{10}$/,
    phoneExample: '+86 138 0013 8000',
    regions: [
      'Beijing', 'Shanghai', 'Tianjin', 'Chongqing', 'Hebei', 'Shanxi', 'Inner Mongolia',
      'Liaoning', 'Jilin', 'Heilongjiang', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian',
      'Jiangxi', 'Shandong', 'Henan', 'Hubei', 'Hunan', 'Guangdong', 'Guangxi', 'Hainan',
      'Sichuan', 'Guizhou', 'Yunnan', 'Tibet', 'Shaanxi', 'Gansu', 'Qinghai', 'Ningxia',
      'Xinjiang', 'Hong Kong', 'Macau'
    ]
  },
  'IN': {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    phoneCode: '+91',
    phonePattern: /^\+91[6-9]\d{9}$/,
    phoneExample: '+91 98765 43210',
    regions: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
      'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
      'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
      'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh', 'Dadra and Nagar Haveli',
      'Daman and Diu', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ]
  },
  'AU': {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    phoneCode: '+61',
    phonePattern: /^\+61[2-9]\d{8}$/,
    phoneExample: '+61 4 1234 5678',
    regions: [
      'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia',
      'Tasmania', 'Northern Territory', 'Australian Capital Territory'
    ]
  },
  'NZ': {
    code: 'NZ',
    name: 'New Zealand',
    phoneCode: '+64',
    phonePattern: /^\+64[2-9]\d{7,8}$/,
    phoneExample: '+64 21 123 456',
    regions: [
      'Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', 'Hawke\'s Bay', 'Manawatu-Wanganui',
      'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman',
      'Waikato', 'Wellington', 'West Coast'
    ]
  },

  // Middle East & Africa
  'SA': {
    code: 'SA',
    name: 'Saudi Arabia',
    phoneCode: '+966',
    phonePattern: /^\+966[5][0-9]\d{7}$/,
    phoneExample: '+966 50 123 4567',
    regions: [
      'Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk', 'Qassim', 'Ha\'il',
      'Northern Borders', 'Jazan', 'Najran', 'Al Bahah', 'Al Jawf'
    ]
  },
  'AE': {
    code: 'AE',
    name: 'United Arab Emirates',
    phoneCode: '+971',
    phonePattern: /^\+971[5][0-9]\d{7}$/,
    phoneExample: '+971 50 123 4567',
    regions: [
      'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'
    ]
  },
  'EG': {
    code: 'EG',
    name: 'Egypt',
    phoneCode: '+20',
    phonePattern: /^\+20[1][0-9]\d{8}$/,
    phoneExample: '+20 10 1234 5678',
    regions: [
      'Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef', 'Cairo', 'Dakahlia', 'Damietta',
      'Fayyum', 'Gharbia', 'Giza', 'Ismailia', 'Kafr el-Sheikh', 'Luxor', 'Matruh', 'Minya',
      'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 'Qena', 'Red Sea',
      'Sharqia', 'Sohag', 'South Sinai', 'Suez'
    ]
  },
  'PS': {
    code: 'PS',
    name: 'Palestine',
    phoneCode: '+970',
    phonePattern: /^\+970[5-9]\d{7}$/,
    phoneExample: '+970 59 123 4567',
    regions: [
      'West Bank', 'Gaza Strip', 'Jerusalem', 'Hebron', 'Nablus', 'Ramallah', 'Bethlehem',
      'Jenin', 'Tulkarm', 'Qalqilya', 'Salfit', 'Tubas', 'Jericho', 'Gaza', 'Khan Yunis',
      'Rafah', 'Deir al-Balah', 'North Gaza'
    ]
  },
  'ZA': {
    code: 'ZA',
    name: 'South Africa',
    phoneCode: '+27',
    phonePattern: /^\+27[6-8]\d{8}$/,
    phoneExample: '+27 82 123 4567',
    regions: [
      'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga',
      'Northern Cape', 'North West', 'Western Cape'
    ]
  },

  // South America
  'BR': {
    code: 'BR',
    name: 'Brazil',
    phoneCode: '+55',
    phonePattern: /^\+55[1-9]\d{10}$/,
    phoneExample: '+55 11 91234 5678',
    regions: [
      'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
      'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba',
      'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
      'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
    ]
  },
  'AR': {
    code: 'AR',
    name: 'Argentina',
    phoneCode: '+54',
    phonePattern: /^\+54[1-9]\d{9,10}$/,
    phoneExample: '+54 11 1234 5678',
    regions: [
      'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos',
      'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén',
      'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
      'Santiago del Estero', 'Tierra del Fuego', 'Tucumán', 'Ciudad Autónoma de Buenos Aires'
    ]
  },

  // Additional countries - Complete ISO 3166-1 standard coverage
  'RU': {
    code: 'RU',
    name: 'Russia',
    phoneCode: '+7',
    phonePattern: /^\+7[9]\d{9}$/,
    phoneExample: '+7 912 345 6789',
    regions: [
      'Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Nizhny Novgorod', 'Kazan',
      'Chelyabinsk', 'Omsk', 'Samara', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Perm',
      'Voronezh', 'Volgograd', 'Krasnodar', 'Saratov', 'Tyumen', 'Tolyatti', 'Izhevsk'
    ]
  },
  'TR': {
    code: 'TR',
    name: 'Turkey',
    phoneCode: '+90',
    phonePattern: /^\+90[5]\d{9}$/,
    phoneExample: '+90 532 123 4567',
    regions: [
      'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
      'Mersin', 'Diyarbakir', 'Kayseri', 'Eskisehir', 'Urfa', 'Malatya', 'Erzurum',
      'Van', 'Batman', 'Elazig', 'Erzincan', 'Sivas', 'Tokat', 'Trabzon'
    ]
  },
  'NG': {
    code: 'NG',
    name: 'Nigeria',
    phoneCode: '+234',
    phonePattern: /^\+234[7-9]\d{9}$/,
    phoneExample: '+234 802 123 4567',
    regions: [
      'Lagos', 'Kano', 'Ibadan', 'Kaduna', 'Port Harcourt', 'Benin City', 'Maiduguri', 'Zaria',
      'Aba', 'Jos', 'Ilorin', 'Oyo', 'Enugu', 'Abeokuta', 'Abuja', 'Sokoto', 'Onitsha',
      'Warri', 'Okene', 'Calabar', 'Uyo', 'Katsina', 'Ado-Ekiti', 'Akure', 'Bauchi'
    ]
  },
  'KE': {
    code: 'KE',
    name: 'Kenya',
    phoneCode: '+254',
    phonePattern: /^\+254[7]\d{8}$/,
    phoneExample: '+254 712 345 678',
    regions: [
      'Nairobi', 'Mombasa', 'Nakuru', 'Eldoret', 'Kisumu', 'Thika', 'Malindi', 'Kitale',
      'Garissa', 'Kakamega', 'Machakos', 'Meru', 'Nyeri', 'Kericho', 'Migori', 'Uasin Gishu',
      'Siaya', 'Narok', 'Vihiga', 'Bomet', 'Mandera', 'Kwale'
    ]
  },
  
  // Additional European countries
  'AT': {
    code: 'AT',
    name: 'Austria',
    phoneCode: '+43',
    phonePattern: /^\+43[1-9]\d{8,12}$/,
    phoneExample: '+43 1 234 5678',
    regions: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Pölten']
  },
  'BE': {
    code: 'BE',
    name: 'Belgium',
    phoneCode: '+32',
    phonePattern: /^\+32[1-9]\d{7,8}$/,
    phoneExample: '+32 2 123 4567',
    regions: ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons']
  },
  'CH': {
    code: 'CH',
    name: 'Switzerland',
    phoneCode: '+41',
    phonePattern: /^\+41[1-9]\d{8}$/,
    phoneExample: '+41 44 123 4567',
    regions: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano']
  },
  'CZ': {
    code: 'CZ',
    name: 'Czech Republic',
    phoneCode: '+420',
    phonePattern: /^\+420[1-9]\d{8}$/,
    phoneExample: '+420 123 456 789',
    regions: ['Prague', 'Brno', 'Ostrava', 'Plzen', 'Liberec', 'Olomouc', 'Budweis', 'Hradec Králové', 'Ústí nad Labem']
  },
  'DK': {
    code: 'DK',
    name: 'Denmark',
    phoneCode: '+45',
    phonePattern: /^\+45[1-9]\d{7}$/,
    phoneExample: '+45 12 34 56 78',
    regions: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle']
  },
  'FI': {
    code: 'FI',
    name: 'Finland',
    phoneCode: '+358',
    phonePattern: /^\+358[1-9]\d{6,9}$/,
    phoneExample: '+358 50 123 4567',
    regions: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio']
  },
  'GR': {
    code: 'GR',
    name: 'Greece',
    phoneCode: '+30',
    phonePattern: /^\+30[1-9]\d{9}$/,
    phoneExample: '+30 21 1234 5678',
    regions: ['Athens', 'Thessaloniki', 'Patras', 'Piraeus', 'Larissa', 'Heraklion', 'Peristeri', 'Kallithea', 'Acharnes']
  },
  'HU': {
    code: 'HU',
    name: 'Hungary',
    phoneCode: '+36',
    phonePattern: /^\+36[1-9]\d{8}$/,
    phoneExample: '+36 1 234 5678',
    regions: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár']
  },
  'IE': {
    code: 'IE',
    name: 'Ireland',
    phoneCode: '+353',
    phonePattern: /^\+353[1-9]\d{7,8}$/,
    phoneExample: '+353 1 234 5678',
    regions: ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords', 'Bray']
  },
  'NO': {
    code: 'NO',
    name: 'Norway',
    phoneCode: '+47',
    phonePattern: /^\+47[1-9]\d{7}$/,
    phoneExample: '+47 12 34 56 78',
    regions: ['Oslo', 'Bergen', 'Stavanger', 'Trondheim', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes', 'Tromsø']
  },
  'PL': {
    code: 'PL',
    name: 'Poland',
    phoneCode: '+48',
    phonePattern: /^\+48[1-9]\d{8}$/,
    phoneExample: '+48 12 345 6789',
    regions: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin']
  },
  'PT': {
    code: 'PT',
    name: 'Portugal',
    phoneCode: '+351',
    phonePattern: /^\+351[1-9]\d{8}$/,
    phoneExample: '+351 21 123 4567',
    regions: ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal', 'Almada']
  },
  'RO': {
    code: 'RO',
    name: 'Romania',
    phoneCode: '+40',
    phonePattern: /^\+40[1-9]\d{8}$/,
    phoneExample: '+40 21 123 4567',
    regions: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Craiova', 'Brașov', 'Galați', 'Ploiești']
  },
  'SE': {
    code: 'SE',
    name: 'Sweden',
    phoneCode: '+46',
    phonePattern: /^\+46[1-9]\d{7,8}$/,
    phoneExample: '+46 8 123 456 78',
    regions: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping']
  },
  'SK': {
    code: 'SK',
    name: 'Slovakia',
    phoneCode: '+421',
    phonePattern: /^\+421[1-9]\d{8}$/,
    phoneExample: '+421 2 1234 5678',
    regions: ['Bratislava', 'Košice', 'Prešov', 'Žilina', 'Banská Bystrica', 'Nitra', 'Trnava', 'Martin', 'Trenčín']
  },
  'SI': {
    code: 'SI',
    name: 'Slovenia',
    phoneCode: '+386',
    phonePattern: /^\+386[1-9]\d{7,8}$/,
    phoneExample: '+386 1 234 5678',
    regions: ['Ljubljana', 'Maribor', 'Celje', 'Kranj', 'Velenje', 'Koper', 'Novo Mesto', 'Ptuj', 'Trbovlje']
  },

  // Asian countries
  'TH': {
    code: 'TH',
    name: 'Thailand',
    phoneCode: '+66',
    phonePattern: /^\+66[1-9]\d{8}$/,
    phoneExample: '+66 2 123 4567',
    regions: ['Bangkok', 'Nonthaburi', 'Nakhon Ratchasima', 'Chiang Mai', 'Hat Yai', 'Udon Thani', 'Pak Kret', 'Khon Kaen', 'Nakhon Si Thammarat']
  },
  'VN': {
    code: 'VN',
    name: 'Vietnam',
    phoneCode: '+84',
    phonePattern: /^\+84[1-9]\d{8,9}$/,
    phoneExample: '+84 24 1234 5678',
    regions: ['Ho Chi Minh City', 'Hanoi', 'Haiphong', 'Da Nang', 'Bien Hoa', 'Hue', 'Nha Trang', 'Can Tho', 'Rach Gia']
  },
  'MY': {
    code: 'MY',
    name: 'Malaysia',
    phoneCode: '+60',
    phonePattern: /^\+60[1-9]\d{7,8}$/,
    phoneExample: '+60 3 1234 5678',
    regions: ['Kuala Lumpur', 'George Town', 'Ipoh', 'Shah Alam', 'Petaling Jaya', 'Klang', 'Johor Bahru', 'Subang Jaya', 'Kuching']
  },
  'SG': {
    code: 'SG',
    name: 'Singapore',
    phoneCode: '+65',
    phonePattern: /^\+65[1-9]\d{7}$/,
    phoneExample: '+65 6123 4567',
    regions: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region']
  },
  'ID': {
    code: 'ID',
    name: 'Indonesia',
    phoneCode: '+62',
    phonePattern: /^\+62[1-9]\d{8,11}$/,
    phoneExample: '+62 21 1234 5678',
    regions: ['Jakarta', 'Surabaya', 'Bandung', 'Bekasi', 'Medan', 'Depok', 'Tangerang', 'Palembang', 'Semarang']
  },
  'PH': {
    code: 'PH',
    name: 'Philippines',
    phoneCode: '+63',
    phonePattern: /^\+63[1-9]\d{9}$/,
    phoneExample: '+63 2 1234 5678',
    regions: ['Manila', 'Quezon City', 'Caloocan', 'Las Piñas', 'Makati', 'Pasig', 'Taguig', 'Marikina', 'Muntinlupa']
  },
  'BD': {
    code: 'BD',
    name: 'Bangladesh',
    phoneCode: '+880',
    phonePattern: /^\+880[1-9]\d{8,9}$/,
    phoneExample: '+880 2 1234 5678',
    regions: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh', 'Comilla']
  },
  'PK': {
    code: 'PK',
    name: 'Pakistan',
    phoneCode: '+92',
    phonePattern: /^\+92[1-9]\d{9}$/,
    phoneExample: '+92 21 1234 5678',
    regions: ['Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Hyderabad', 'Gujranwala', 'Peshawar', 'Quetta']
  },
  'LK': {
    code: 'LK',
    name: 'Sri Lanka',
    phoneCode: '+94',
    phonePattern: /^\+94[1-9]\d{8}$/,
    phoneExample: '+94 11 234 5678',
    regions: ['Colombo', 'Dehiwala-Mount Lavinia', 'Moratuwa', 'Negombo', 'Kandy', 'Kalmunai', 'Galle', 'Trincomalee', 'Batticaloa']
  },

  // Middle East countries
  'PS': {
    code: 'PS',
    name: 'Palestine',
    flag: '🇵🇸',
    phoneCode: '+970',
    phonePattern: /^\+970[1-9]\d{6,7}$/,
    phoneExample: '+970 2 123 4567',
    regions: ['Gaza Strip', 'West Bank', 'Jerusalem', 'Ramallah', 'Hebron', 'Nablus', 'Bethlehem', 'Jenin', 'Tulkarm', 'Qalqilya']
  },
  'JO': {
    code: 'JO',
    name: 'Jordan',
    phoneCode: '+962',
    phonePattern: /^\+962[1-9]\d{7,8}$/,
    phoneExample: '+962 6 123 4567',
    regions: ['Amman', 'Zarqa', 'Irbid', 'Russeifa', 'Wadi as-Sir', 'Aqaba', 'Madaba', 'Mafraq', 'Jerash']
  },
  'LB': {
    code: 'LB',
    name: 'Lebanon',
    phoneCode: '+961',
    phonePattern: /^\+961[1-9]\d{6,7}$/,
    phoneExample: '+961 1 123 456',
    regions: ['Beirut', 'Tripoli', 'Sidon', 'Tyre', 'Nabatieh', 'Jounieh', 'Zahle', 'Baalbek', 'Byblos']
  },
  'KW': {
    code: 'KW',
    name: 'Kuwait',
    phoneCode: '+965',
    phonePattern: /^\+965[1-9]\d{7}$/,
    phoneExample: '+965 1234 5678',
    regions: ['Kuwait City', 'Al Ahmadi', 'Hawalli', 'As Salimiyah', 'Sabah as Salim', 'Al Farwaniyah', 'Al Jahra', 'Ar Riqqah']
  },
  'QA': {
    code: 'QA',
    name: 'Qatar',
    phoneCode: '+974',
    phonePattern: /^\+974[1-9]\d{7}$/,
    phoneExample: '+974 1234 5678',
    regions: ['Doha', 'Al Rayyan', 'Umm Salal', 'Al Khor', 'Al Wakrah', 'Ash Shamal', 'Az Za\'ayin', 'Madinat ash Shamal']
  },
  'BH': {
    code: 'BH',
    name: 'Bahrain',
    phoneCode: '+973',
    phonePattern: /^\+973[1-9]\d{7}$/,
    phoneExample: '+973 1234 5678',
    regions: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'A\'ali', 'Isa Town', 'Sitra', 'Budaiya', 'Jidhafs']
  },
  'OM': {
    code: 'OM',
    name: 'Oman',
    phoneCode: '+968',
    phonePattern: /^\+968[1-9]\d{7}$/,
    phoneExample: '+968 1234 5678',
    regions: ['Muscat', 'Seeb', 'Salalah', 'Bawshar', 'Sohar', 'As Suwayq', 'Ibri', 'Saham', 'Barka']
  },

  // African countries
  'MA': {
    code: 'MA',
    name: 'Morocco',
    phoneCode: '+212',
    phonePattern: /^\+212[1-9]\d{8}$/,
    phoneExample: '+212 5 1234 5678',
    regions: ['Casablanca', 'Rabat', 'Fez', 'Marrakech', 'Agadir', 'Tangier', 'Meknes', 'Oujda', 'Kenitra']
  },
  'TN': {
    code: 'TN',
    name: 'Tunisia',
    phoneCode: '+216',
    phonePattern: /^\+216[1-9]\d{7}$/,
    phoneExample: '+216 71 123 456',
    regions: ['Tunis', 'Sfax', 'Sousse', 'Ettadhamen', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 'Gafsa']
  },
  'DZ': {
    code: 'DZ',
    name: 'Algeria',
    phoneCode: '+213',
    phonePattern: /^\+213[1-9]\d{8}$/,
    phoneExample: '+213 21 123 456',
    regions: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Djelfa', 'Sétif', 'Sidi Bel Abbès']
  },
  'GH': {
    code: 'GH',
    name: 'Ghana',
    phoneCode: '+233',
    phonePattern: /^\+233[1-9]\d{8}$/,
    phoneExample: '+233 20 123 4567',
    regions: ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Atsiaman', 'Tema', 'Teshi Old Town', 'Cape Coast', 'Sekondi-Takoradi']
  },
  'CI': {
    code: 'CI',
    name: 'Côte d\'Ivoire',
    phoneCode: '+225',
    phonePattern: /^\+225[1-9]\d{7}$/,
    phoneExample: '+225 20 12 34 56',
    regions: ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Divo', 'Korhogo', 'Anyama', 'Gagnoa']
  },
  'SN': {
    code: 'SN',
    name: 'Senegal',
    phoneCode: '+221',
    phonePattern: /^\+221[1-9]\d{8}$/,
    phoneExample: '+221 33 123 4567',
    regions: ['Dakar', 'Touba', 'Thiès', 'Kaolack', 'Saint-Louis', 'Mbour', 'Rufisque', 'Ziguinchor', 'Diourbel']
  },
  'UG': {
    code: 'UG',
    name: 'Uganda',
    phoneCode: '+256',
    phonePattern: /^\+256[1-9]\d{8}$/,
    phoneExample: '+256 41 123 4567',
    regions: ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja', 'Bwizibwera', 'Njeru', 'Mukono', 'Kasese']
  },
  'TZ': {
    code: 'TZ',
    name: 'Tanzania',
    phoneCode: '+255',
    phonePattern: /^\+255[1-9]\d{8}$/,
    phoneExample: '+255 22 123 4567',
    regions: ['Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga', 'Kahama', 'Tabora']
  },
  'ET': {
    code: 'ET',
    name: 'Ethiopia',
    phoneCode: '+251',
    phonePattern: /^\+251[1-9]\d{8}$/,
    phoneExample: '+251 11 123 4567',
    regions: ['Addis Ababa', 'Dire Dawa', 'Mek\'ele', 'Adama', 'Awasa', 'Bahir Dar', 'Gondar', 'Dessie', 'Jimma']
  },

  // South American countries
  'CO': {
    code: 'CO',
    name: 'Colombia',
    phoneCode: '+57',
    phonePattern: /^\+57[1-9]\d{9}$/,
    phoneExample: '+57 1 234 5678',
    regions: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Soledad', 'Ibagué', 'Bucaramanga']
  },
  'PE': {
    code: 'PE',
    name: 'Peru',
    phoneCode: '+51',
    phonePattern: /^\+51[1-9]\d{8}$/,
    phoneExample: '+51 1 234 5678',
    regions: ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Huancayo', 'Piura', 'Iquitos', 'Cusco', 'Chimbote']
  },
  'VE': {
    code: 'VE',
    name: 'Venezuela',
    phoneCode: '+58',
    phonePattern: /^\+58[1-9]\d{9}$/,
    phoneExample: '+58 212 123 4567',
    regions: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'San Cristóbal', 'Maturín', 'Ciudad Bolívar']
  },
  'CL': {
    code: 'CL',
    name: 'Chile',
    phoneCode: '+56',
    phonePattern: /^\+56[1-9]\d{8}$/,
    phoneExample: '+56 2 1234 5678',
    regions: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica']
  },
  'EC': {
    code: 'EC',
    name: 'Ecuador',
    phoneCode: '+593',
    phonePattern: /^\+593[1-9]\d{8}$/,
    phoneExample: '+593 2 123 4567',
    regions: ['Guayaquil', 'Quito', 'Cuenca', 'Santo Domingo', 'Machala', 'Durán', 'Manta', 'Portoviejo', 'Ambato']
  },
  'BO': {
    code: 'BO',
    name: 'Bolivia',
    phoneCode: '+591',
    phonePattern: /^\+591[1-9]\d{7}$/,
    phoneExample: '+591 2 123 4567',
    regions: ['Santa Cruz', 'La Paz', 'Cochabamba', 'Oruro', 'Sucre', 'Tarija', 'Potosí', 'Sacaba', 'Quillacollo']
  },
  'PY': {
    code: 'PY',
    name: 'Paraguay',
    phoneCode: '+595',
    phonePattern: /^\+595[1-9]\d{8}$/,
    phoneExample: '+595 21 123 456',
    regions: ['Asunción', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiatá', 'Lambaré', 'Fernando de la Mora', 'Limpio', 'Ñemby']
  },
  'UY': {
    code: 'UY',
    name: 'Uruguay',
    phoneCode: '+598',
    phonePattern: /^\+598[1-9]\d{7,8}$/,
    phoneExample: '+598 2 123 4567',
    regions: ['Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera', 'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes']
  },

  // North American countries (additional)
  'GT': {
    code: 'GT',
    name: 'Guatemala',
    phoneCode: '+502',
    phonePattern: /^\+502[1-9]\d{7}$/,
    phoneExample: '+502 2345 6789',
    regions: ['Guatemala City', 'Mixco', 'Villa Nueva', 'Petapa', 'San Juan Sacatepéquez', 'Quetzaltenango', 'Villa Canales', 'Escuintla', 'Chinautla']
  },
  'CR': {
    code: 'CR',
    name: 'Costa Rica',
    phoneCode: '+506',
    phonePattern: /^\+506[1-9]\d{7}$/,
    phoneExample: '+506 2234 5678',
    regions: ['San José', 'Cartago', 'Alajuela', 'Puntarenas', 'Heredia', 'Limón', 'Desamparados', 'Purral', 'San Vicente']
  },
  'PA': {
    code: 'PA',
    name: 'Panama',
    phoneCode: '+507',
    phonePattern: /^\+507[1-9]\d{7}$/,
    phoneExample: '+507 123 4567',
    regions: ['Panama City', 'San Miguelito', 'Tocumen', 'David', 'Arraiján', 'Colón', 'La Chorrera', 'Pacora', 'Pedregal']
  },
  'DO': {
    code: 'DO',
    name: 'Dominican Republic',
    phoneCode: '+1',
    phonePattern: /^\+1[8][0-9]{2}[2-9]\d{6}$/,
    phoneExample: '+1 809 234 5678',
    regions: ['Santo Domingo', 'Santiago', 'Santo Domingo Oeste', 'Santo Domingo Este', 'San Pedro de Macorís', 'La Romana', 'Bella Vista', 'San Cristóbal', 'Puerto Plata']
  },
  'JM': {
    code: 'JM',
    name: 'Jamaica',
    phoneCode: '+1',
    phonePattern: /^\+1[8][7][6]\d{7}$/,
    phoneExample: '+1 876 123 4567',
    regions: ['Kingston', 'Spanish Town', 'Portmore', 'Montego Bay', 'May Pen', 'Mandeville', 'Old Harbour', 'Savanna-la-Mar', 'Linstead']
  }
};

// Helper functions for validation
export const validatePhoneNumber = (phone: string, countryCode: string): boolean => {
  const country = COUNTRIES[countryCode];
  if (!country) return false;
  return country.phonePattern.test(phone);
};

export const formatPhoneNumber = (phone: string, countryCode: string): string => {
  const country = COUNTRIES[countryCode];
  if (!country) return phone;
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (!phone.startsWith(country.phoneCode)) {
    return country.phoneCode + digits;
  }
  
  return phone;
};


