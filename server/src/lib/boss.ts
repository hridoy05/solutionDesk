import PgBoss from 'pg-boss';

const boss = new PgBoss(process.env.DATABASE_URL!);
export default boss;
