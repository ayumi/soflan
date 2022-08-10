/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema
    .createTable("songs", function (table) {
      table.increments("id");
      table.string("title", 255);
      table.string("artist", 255);
      table.json("charts");
      table.boolean("chart_type_dance_single");
      table.boolean("chart_type_dance_double");
      table.json("other_data");
      table.timestamps();
      table.unique(["title", "artist"]);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema
    .dropTable("songs")
};
