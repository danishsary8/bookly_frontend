# Top rated: demo reviews and rating research

Reviewed 2026-11-11. The preview uses original synthetic reviews, not copied Goodreads reviews. Public community ratings are research only and are not presented as Bookly customer reviews.

## Local preview

`.env.local` enables `VITE_DEMO_REVIEWS=true`. `TopRated.tsx` applies this only when `import.meta.env.DEV` is true and displays a demo label. The connected live API is read-only for this preview. Remove the variable to see unmodified live ratings. Production builds ignore the preview flag.

The ten fixture books each have 7–10 integer ratings with an average above 3.5. Only ratings of 3.5 or higher qualify for the Top rated section; real low ratings are filtered, never increased. The generated preview fixture is `src/data/topRatedDemo.json`.

## Local database seeder

From `bookly_backend_v2`, run `php artisan db:seed --class=TopRatedDemoSeeder`. It only runs in local/testing environments and can be repeated. It creates dedicated Demo Reader accounts, explicitly synthetic delivered-order records, and `[Demo review]` comments. Existing reviews are preserved. No real checkout, stock movement, payment or email is generated.

The source fixture is `bookly_backend_v2/database/seeders/data/top_rated_reviews.json`; after editing it, copy it to `bookly_frontend/src/data/topRatedDemo.json` to update the independent live-API preview. Database averages can differ slightly because existing customer reviews are included in database totals.

## Public rating research

Values below are Goodreads indexed snapshots retrieved during research, not a live feed. Counts change, and editions may share a work-level aggregate. Rating count measures popularity; average score measures reader sentiment. This is a comparison of checked catalog titles, not an exhaustive ranking of every book on the internet.

| Existing catalog book | Average / 5 | Approximate ratings | Source |
| --- | --- | --- | --- |
| Harry Potter and the Sorcerer's Stone | 4.47 | 11.9 million | https://www.goodreads.com/list/show/118270.Average_Rating_4_2_200k_Ratings_Non_Sequel_Books |
| Harry Potter and the Deathly Hallows | 4.62 | 4.26 million | https://www.goodreads.com/series/45175-harry-potter |
| The Way of Kings | 4.66 | 737,000 | https://www.goodreads.com/series/49075 |
| The Name of the Wind | 4.52 | 1.125 million | https://www.goodreads.com/book/show/13077071-the-name-of-the-wind |
| Dune | 4.29 | 1.727 million | https://www.goodreads.com/series/45935-dune-chronicles |
| The Lion, the Witch and the Wardrobe | 4.24 | 3.245 million | https://www.goodreads.com/list/show/118270.Average_Rating_4_2_200k_Ratings_Non_Sequel_Books |
| The Sea of Monsters | 4.24 | 1.434 million | https://www.goodreads.com/book/show/8254174 |
| Atomic Habits | 4.30 | 1.441 million | https://www.goodreads.com/book/show/33154385 |

Of these checked titles, Sorcerer's Stone has the most ratings; The Way of Kings has the highest average. Consider those as future researched Reader rating entries, with Goodreads attribution, rather than fabricated customer reviews.
