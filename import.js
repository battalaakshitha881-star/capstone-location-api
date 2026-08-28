const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importData(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${rows.length} rows to import...`);

  // Ensure India exists
  let india = await prisma.country.findFirst({ where: { code: 'IN' } });
  if (!india) {
    india = await prisma.country.create({ data: { name: 'India', code: 'IN' } });
  }

  let imported = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const stateCode = String(row['MDDS STC']).trim();
      const stateName = String(row['STATE NAME']).trim();
      const districtCode = String(row['MDDS DTC']).trim();
      const districtName = String(row['DISTRICT NAME']).trim();
      const subDistrictCode = String(row['MDDS Sub_DT']).trim();
      const subDistrictName = String(row['SUB-DISTRICT NAME']).trim();
      const villageCode = String(row['MDDS PLCN']).trim();
      const villageName = String(row['Area Name']).trim();

      // Upsert State
      let state = await prisma.state.findFirst({ where: { code: stateCode, countryId: india.id } });
      if (!state) {
        state = await prisma.state.create({
          data: { name: stateName, code: stateCode, countryId: india.id }
        });
      }

      // Upsert District
      let district = await prisma.district.findFirst({ where: { code: districtCode, stateId: state.id } });
      if (!district) {
        district = await prisma.district.create({
          data: { name: districtName, code: districtCode, stateId: state.id }
        });
      }

      // Upsert SubDistrict
      let subDistrict = await prisma.subDistrict.findFirst({ where: { code: subDistrictCode, districtId: district.id } });
      if (!subDistrict) {
        subDistrict = await prisma.subDistrict.create({
          data: { name: subDistrictName, code: subDistrictCode, districtId: district.id }
        });
      }

      // Create Village (skip if exists)
      const existingVillage = await prisma.village.findFirst({ where: { code: villageCode, subDistrictId: subDistrict.id } });
      if (!existingVillage) {
        await prisma.village.create({
          data: { name: villageName, code: villageCode, subDistrictId: subDistrict.id }
        });
      }

      imported++;
    } catch (err) {
      errors++;
      console.log(`Error on row: ${JSON.stringify(row)} - ${err.message}`);
    }
  }

  console.log(`Import complete. Imported: ${imported}, Errors: ${errors}`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: node import.js <path-to-file>');
  process.exit(1);
}

importData(filePath)
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());