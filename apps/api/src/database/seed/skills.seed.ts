import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/placecampus';

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    normalizedName: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    synonyms: { type: [String], default: [] },
  },
  { timestamps: true },
);

const Skill = mongoose.model('Skill', skillSchema);

const skillsToSeed = [
  'React',
  'Node.js',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'Next.js',
  'AWS',
  'Docker',
  'Kubernetes',
  'MongoDB',
  'SQL',
  'PostgreSQL',
  'Git',
  'HTML',
  'CSS',
  'Tailwind CSS',
  'GraphQL',
  'REST API',
  'Linux',
  'Data Structures',
  'Algorithms',
  'Machine Learning',
  'System Design',
  'Angular',
  'Vue.js',
  'Spring Boot',
  'Django',
  'Express.js',
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    for (const skillName of skillsToSeed) {
      const normalized = skillName.toLowerCase().replace(/[^a-z0-9]/g, '');
      await Skill.updateOne(
        { normalizedName: normalized },
        {
          $set: {
            name: skillName,
            normalizedName: normalized,
            active: true,
          },
        },
        { upsert: true },
      );
      console.log(`Seeded skill: ${skillName}`);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding skills:', err);
    process.exit(1);
  }
}

seed();
