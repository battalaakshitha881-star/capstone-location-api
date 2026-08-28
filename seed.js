const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const india = await prisma.country.create({
    data: { name: 'India', code: 'IN' }
  });

  const maharashtra = await prisma.state.create({
    data: { name: 'Maharashtra', code: '27', countryId: india.id }
  });

  const nandurbar = await prisma.district.create({
    data: { name: 'Nandurbar', code: '497', stateId: maharashtra.id }
  });

  const akkalkuwa = await prisma.subDistrict.create({
    data: { name: 'Akkalkuwa', code: '03950', districtId: nandurbar.id }
  });

  await prisma.village.createMany({
    data: [
      { name: 'Manibeli', code: '525002', subDistrictId: akkalkuwa.id },
      { name: 'Dhankhedi', code: '525003', subDistrictId: akkalkuwa.id },
      { name: 'Chimalkhadi', code: '525004', subDistrictId: akkalkuwa.id },
      { name: 'Sinduri', code: '525005', subDistrictId: akkalkuwa.id },
    ]
  });

  console.log('Seed data inserted successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());