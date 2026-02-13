import dotenv from "dotenv";
import db, { initializeDatabase } from "../config/database.js";
import { GasStation } from "../models/index.js";

dotenv.config();

// Initialize database first
console.log("🔄 Inicializando base de datos...");
initializeDatabase();

// TotalEnergies Gas Stations Data
const gasStations = [
  // ZONA SUR – DISTRITO NACIONAL / SANTO DOMINGO
  {
    name: "TotalEnergies Bella Norte",
    address: "Av. 27 de Febrero No. 510, Los Restauradores",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Centauro",
    address: "Av. Duarte esq. Central No. 377, Ens. Luperón",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Colombia",
    address: "Av. República de Colombia casi esq. La Pelona",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Dominicana",
    address: "Av. Máximo Gómez No. 106",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies El Pilar",
    address: "Av. Marcos Ruíz esq. Moca",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies El Triángulo",
    address: "Av. Independencia esq. Padre Billini",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies KM 14",
    address: "Autopista Duarte Km 14",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies La 27",
    address: "Av. 27 de Febrero No. 350, La Esperilla",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies La Castellana",
    address: "Av. Gustavo Mejía Ricart esq. Dr. Defilló",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies La Churchill",
    address: "Av. Winston Churchill No. 100, Urb. Fernández",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies La Kennedy",
    address: "Av. John F. Kennedy esq. Tiradentes, Ens. La Fe",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies La Rómulo",
    address: "Av. Rómulo Betancourt esq. Privada, Mirador Sur",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Tiradentes",
    address: "Av. Tiradentes No. 10, Ens. Naco",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Los Próceres",
    address: "Av. Los Próceres esq. Av. Sol Poniente",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Paraíso",
    address: "Av. Winston Churchill, Ens. Paraíso",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Quisqueya",
    address: "Av. Máximo Gómez No. 32",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies V Centenario",
    address: "Av. V Centenario",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Plaza Bandera",
    address: "Av. 27 de Febrero esq. Calle H",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Miramar",
    address: "Av. 30 de Mayo Km 5 ½",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Millennium",
    address: "Av. Rómulo Betancourt",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies On The Boulevard",
    address: "Av. Winston Churchill esq. Francisco Pratts Ramírez",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Las Antillas",
    address: "Av. Independencia No. 75",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies La Vecina",
    address: "Av. Núñez de Cáceres, Las Praderas",
    zone: "Distrito Nacional",
    province: "Santo Domingo",
  },

  // ZONA SUR – SANTO DOMINGO ESTE / OESTE / NORTE
  {
    name: "TotalEnergies Las Américas",
    address: "Autopista Las Américas Km 5",
    zone: "Santo Domingo Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Las Américas II",
    address: "Autopista Las Américas esq. Calle 4, La Caleta",
    zone: "Santo Domingo Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Los Mina",
    address: "Av. San Vicente de Paúl esq. Arz. Navarrete",
    zone: "Santo Domingo Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Ozama",
    address: "Av. Las Américas esq. Venezuela",
    zone: "Santo Domingo Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies San Isidro",
    address: "Autopista San Isidro Km 7",
    zone: "Santo Domingo Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies San Luis",
    address: "Carretera Mella Km 13 ½, El Almirante",
    zone: "Santo Domingo Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Bella Vista Nte",
    address: "Av. Hermanas Mirabal No. 420, Villa Mella",
    zone: "Santo Domingo Norte",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Ciudad Modelo",
    address: "Av. Jacobo Majluta, Plaza Ciudad Modelo",
    zone: "Santo Domingo Norte",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Los Alcarrizos",
    address: "Calle Duarte No. 22",
    zone: "Santo Domingo Oeste",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies San Miguel",
    address: "Av. Isabel Aguiar esq. Guarocuya",
    zone: "Santo Domingo Oeste",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies 6 de Noviembre",
    address: "Autopista 6 de Noviembre Km 7",
    zone: "Santo Domingo Oeste",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Génesis",
    address: "Autopista 6 de Noviembre Km 9 ½",
    zone: "Santo Domingo Oeste",
    province: "Santo Domingo",
  },

  // ZONA SUR – PROVINCIAS
  {
    name: "TotalEnergies Baní",
    address: "Calle Principal La Montería No. 7",
    zone: "Zona Sur",
    province: "Baní",
  },
  {
    name: "Auto Paniagua",
    address: "Carretera Padre Las Casas",
    zone: "Zona Sur",
    province: "Azua",
  },
  {
    name: "Sanjuanera",
    address: "Carretera Sánchez Km 1 ½",
    zone: "Zona Sur",
    province: "San Juan",
  },
  {
    name: "Las Damas",
    address: "Av. Casandra Damirón Km 2 ½",
    zone: "Zona Sur",
    province: "Barahona",
  },
  {
    name: "Big Star Coral",
    address: "Av. Libertad No. 1",
    zone: "Zona Sur",
    province: "Pedernales",
  },

  // ZONA ESTE
  {
    name: "TotalEnergies La Cucama",
    address: "Autovía del Este, Boca Chica",
    zone: "Zona Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Megapuerto",
    address: "Autopista Las Américas Km 27",
    zone: "Zona Este",
    province: "Santo Domingo",
  },
  {
    name: "TotalEnergies Juan Dolio",
    address: "Autovía del Este Km 56",
    zone: "Zona Este",
    province: "San Pedro de Macorís",
  },
  {
    name: "TotalEnergies Buenavista",
    address: "Av. Circunvalación, San Pedro de Macorís",
    zone: "Zona Este",
    province: "San Pedro de Macorís",
  },
  {
    name: "TotalEnergies San Pedro",
    address: "Av. Rolando Martínez No. 2",
    zone: "Zona Este",
    province: "San Pedro de Macorís",
  },
  {
    name: "TotalEnergies Aeropuerto Romana",
    address: "Autovía del Coral",
    zone: "Zona Este",
    province: "La Romana",
  },
  {
    name: "TotalEnergies Bayahibe",
    address: "Autovía de Bayahibe",
    zone: "Zona Este",
    province: "La Romana",
  },
  {
    name: "TotalEnergies Punta Cana",
    address: "Cruce Bávaro – Punta Cana",
    zone: "Zona Este",
    province: "La Altagracia",
  },
  {
    name: "TotalEnergies Bávaro",
    address: "Autopista Punta Cana – Macao",
    zone: "Zona Este",
    province: "La Altagracia",
  },
  {
    name: "TotalEnergies Downtown",
    address: "Boulevard Turístico del Este",
    zone: "Zona Este",
    province: "La Altagracia",
  },
  {
    name: "TotalEnergies Miches",
    address: "Carretera Bávaro – Miches",
    zone: "Zona Este",
    province: "El Seibo",
  },

  // ZONA NORTE / CIBAO
  {
    name: "TotalEnergies Aeropuerto Cibao",
    address: "Av. Víctor Manuel Espaillat",
    zone: "Zona Norte",
    province: "Santiago",
  },
  {
    name: "TotalEnergies Gurabo",
    address: "Carretera Luperón Km 6 ½",
    zone: "Zona Norte",
    province: "Santiago",
  },
  {
    name: "TotalEnergies La Universitaria",
    address: "Av. Estrella Sadhalá, frente a la PUCMM",
    zone: "Zona Norte",
    province: "Santiago",
  },
  {
    name: "TotalEnergies Navarrete",
    address: "Autopista Duarte",
    zone: "Zona Norte",
    province: "Santiago",
  },
  {
    name: "TotalEnergies Bonao",
    address: "Autopista Duarte Km 8 ½",
    zone: "Zona Norte",
    province: "Monseñor Nouel",
  },
  {
    name: "TotalEnergies La Vega",
    address: "Autopista Duarte, salida La Vega",
    zone: "Zona Norte",
    province: "La Vega",
  },
  {
    name: "TotalEnergies Moca",
    address: "Duarte No. 30",
    zone: "Zona Norte",
    province: "Espaillat",
  },
  {
    name: "TotalEnergies Salcedo",
    address: "Prol. Hermanas Mirabal No. 69",
    zone: "Zona Norte",
    province: "Hermanas Mirabal",
  },
  {
    name: "TotalEnergies Puerto Plata",
    address: "Av. Manolo Tavárez Justo",
    zone: "Zona Norte",
    province: "Puerto Plata",
  },
  {
    name: "TotalEnergies SFM",
    address: "Av. Los Mártires, San Francisco de Macorís",
    zone: "Zona Norte",
    province: "Duarte",
  },
];

console.log("🔄 Insertando gasolineras en la base de datos...\n");

try {
  // Check if stations already exist
  const existingStations = GasStation.getAll();

  if (existingStations.length > 0) {
    console.log(
      `⚠️  Ya existen ${existingStations.length} estaciones en la base de datos.`,
    );
    console.log(
      "   Si deseas resetear, borra el archivo data/fleet-fuel.db y vuelve a ejecutar.\n",
    );
    process.exit(0);
  }

  // Insert stations
  console.log(`📥 Insertando ${gasStations.length} gasolineras...`);
  GasStation.bulkCreate(gasStations);

  // Verify insertion
  const inserted = GasStation.getAll();
  console.log(`\n✅ ${inserted.length} gasolineras insertadas correctamente\n`);

  // Show summary by zone
  console.log("📊 Resumen por zona:");
  const zones = [...new Set(gasStations.map((s) => s.zone))];
  zones.forEach((zone) => {
    const count = gasStations.filter((s) => s.zone === zone).length;
    console.log(`   • ${zone}: ${count} estaciones`);
  });

  console.log("\n🎉 ¡Datos iniciales cargados correctamente!");
  console.log("💡 Ahora puedes iniciar el servidor con: npm run dev\n");

  // Close database connection
  db.close();
  process.exit(0);
} catch (error) {
  console.error("\n❌ Error al insertar gasolineras:", error.message);
  console.error("Stack:", error.stack);
  db.close();
  process.exit(1);
}
