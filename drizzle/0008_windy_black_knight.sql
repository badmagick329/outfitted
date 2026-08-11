ALTER TABLE "wardrobe_items" ADD COLUMN "category_group" varchar(32);
--> statement-breakpoint
UPDATE "wardrobe_items"
SET "category_group" = CASE
	WHEN "category" IS NULL OR btrim("category") = '' THEN NULL
	WHEN "category" ~* '\m(anoraks?|blazers?|bombers?|coats?|gilets?|jackets?|parkas?|raincoats?|shackets?|trenches?|windbreakers?)\M' THEN 'outerwear'
	WHEN "category" ~* '\m(dress(es)?|dungarees?|jumpsuits?|overalls?|playsuits?|rompers?)\M' THEN 'dresses-jumpsuits'
	WHEN "category" ~* '\m(chinos?|culottes?|jeans?|joggers?|leggings?|pants?|shorts?|skirts?|trousers?)\M' THEN 'bottoms'
	WHEN "category" ~* '\m(blouses?|cardigans?|hoodies?|jumpers?|knitwear|mock[- ]necks?|overshirts?|polos?|pullovers?|shirts?|sweaters?|sweatshirts?|tank tops?|tees?|t-shirts?|tops?|turtlenecks?|vests?)\M' THEN 'tops'
	ELSE 'other'
END;
