-- BERLIN — sample menu seed. Apply after the migrations.
-- Prices in INR. image_url left null (the menu UI renders a tonal placeholder);
-- real dish photos get uploaded to Supabase Storage later.

insert into menu_categories (name, sort_order) values
  ('To Begin', 1),
  ('From the Kitchen', 2),
  ('Rooftop Grill', 3),
  ('Sweet', 4),
  ('Cocktails', 5);

-- Helper: category id by name
-- (kept inline via subselects below)

insert into menu_items (category_id, name, description, price, veg_type, tags, is_signature, is_available, sort_order) values
  -- To Begin
  ((select id from menu_categories where name = 'To Begin'), 'Burrata & Heirloom Tomatoes', 'Basil oil, aged balsamic, sea salt', 780, 'veg', '{chef-special}', true, true, 1),
  ((select id from menu_categories where name = 'To Begin'), 'Truffle Arancini', 'Crisp risotto, parmesan, black truffle', 620, 'veg', '{}', false, true, 2),
  ((select id from menu_categories where name = 'To Begin'), 'Chilli Garlic Edamame', 'Steamed, tossed in chilli garlic oil', 420, 'veg', '{vegan,spicy}', false, true, 3),
  ((select id from menu_categories where name = 'To Begin'), 'Wagyu Beef Dim Sum', 'Black garlic, chilli crisp', 1100, 'non_veg', '{chef-special}', true, true, 4),
  ((select id from menu_categories where name = 'To Begin'), 'Tandoori Prawns', 'Charred, saffron yoghurt, lime', 940, 'non_veg', '{spicy}', false, true, 5),

  -- From the Kitchen
  ((select id from menu_categories where name = 'From the Kitchen'), 'Truffle Wild Mushroom Risotto', 'Parmesan, thyme, aged truffle', 920, 'veg', '{chef-special}', true, true, 1),
  ((select id from menu_categories where name = 'From the Kitchen'), 'Paneer Butter Masala', 'Smoked tomato, kasuri methi', 640, 'veg', '{}', false, true, 2),
  ((select id from menu_categories where name = 'From the Kitchen'), 'Butter Chicken', 'Slow-cooked, fenugreek cream', 720, 'non_veg', '{}', false, true, 3),
  ((select id from menu_categories where name = 'From the Kitchen'), 'Pan-Asian Khao Suey', 'Coconut broth, crisp garnishes', 680, 'veg', '{}', false, true, 4),
  ((select id from menu_categories where name = 'From the Kitchen'), 'Lamb Rogan Josh', 'Kashmiri chillies, slow-braised', 860, 'non_veg', '{spicy}', false, true, 5),

  -- Rooftop Grill
  ((select id from menu_categories where name = 'Rooftop Grill'), 'Charcoal Rooftop Grill · Market Catch', 'Whole fish of the day, herb butter', 1240, 'non_veg', '{chef-special}', true, true, 1),
  ((select id from menu_categories where name = 'Rooftop Grill'), 'Grilled Peri Peri Chicken', 'Flame-grilled, house peri peri', 780, 'non_veg', '{spicy}', false, true, 2),
  ((select id from menu_categories where name = 'Rooftop Grill'), 'Charred Vegetable Skewers', 'Seasonal veg, romesco', 560, 'veg', '{vegan}', false, true, 3),

  -- Sweet
  ((select id from menu_categories where name = 'Sweet'), 'Dark Chocolate Fondant', 'Molten centre, vanilla bean ice cream', 480, 'egg', '{}', false, true, 1),
  ((select id from menu_categories where name = 'Sweet'), 'Berlin Baked Cheesecake', 'Burnt basque style, berry compote', 460, 'egg', '{chef-special}', true, true, 2),
  ((select id from menu_categories where name = 'Sweet'), 'Seasonal Sorbet', 'Three scoops, market fruit', 360, 'veg', '{vegan}', false, true, 3),

  -- Cocktails
  ((select id from menu_categories where name = 'Cocktails'), 'Old Fashioned', 'Bourbon, bitters, orange peel', 680, 'veg', '{cocktail}', false, true, 1),
  ((select id from menu_categories where name = 'Cocktails'), 'Smoked Negroni', 'Gin, campari, oak smoke', 720, 'veg', '{cocktail,chef-special}', true, true, 2),
  ((select id from menu_categories where name = 'Cocktails'), 'Rooftop Spritz', 'Aperol, prosecco, citrus', 620, 'veg', '{cocktail}', false, true, 3),
  ((select id from menu_categories where name = 'Cocktails'), 'Rare Single Malt', 'Curated by region', 900, 'veg', '{cocktail}', false, true, 4);
