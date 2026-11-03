import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const states=sqliteTable('states',{userId:text('user_id').primaryKey(),revision:integer('revision').notNull().default(0),data:text('data').notNull().default('{}'),updatedAt:text('updated_at').notNull()});
export const snapshots=sqliteTable('snapshots',{id:text('id').primaryKey(),userId:text('user_id').notNull(),revision:integer('revision').notNull(),data:text('data').notNull(),createdAt:text('created_at').notNull()});
