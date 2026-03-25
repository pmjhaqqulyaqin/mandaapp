import { EOfficeService } from './src/modules/eoffice/service';

async function seed() {
  try {
    await EOfficeService.seedTemplates();
    console.log("Seeding successful");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

seed();
