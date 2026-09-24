"""
Builds seed/taxonomy.json from the 360 Thrift Studio catalogue (15 sections)
and the brand catalogues (Adidas, Carhartt, Columbia, Dickies, Lacoste, Levi's,
Miss Me, Nike, Patagonia, Ralph Lauren, Rock Revival, The North Face,
Tommy Hilfiger, True Religion).

Edit this file, then:  python3 seed/source/build_taxonomy.py && pnpm seed
"""
import json, os

# Canonical fashion categories (/styles/[slug]). Section-level labels map onto these.
STYLES = [
    ("Classic & Preppy", "Ralph Lauren, Tommy Hilfiger, Lacoste and heritage casual."),
    ("Sportswear & Activewear", "Adidas, Nike, Champion, Lululemon and team-sports lines."),
    ("Outdoor & Technical / Gorpcore", "The North Face, Patagonia, Columbia and heritage outdoor."),
    ("Workwear & Utility", "Carhartt, Dickies and heavy canvas work garments."),
    ("Streetwear", "Carhartt WIP, Vans, hip-hop and skatewear labels."),
    ("Denimwear", "Levi's, Wrangler and embellished statement denim."),
    ("Surf & Beachwear", "Rip Curl, Billabong, Quiksilver and board-sports brands."),
    ("Sports Fanwear & Official Merchandise", "Verified official team and league merchandise only."),
    ("Y2K & Vintage", "Verified vintage, original-era Y2K and Y2K-style stock."),
    ("Luxury", "Premium and luxury labels, including items sourced on request."),
]
CP, SP, OT, WU, ST, DN, SB, FW, YV, LX = [s[0] for s in STYLES]

# Stock identities that are not brands
STOCK_GROUPS = {
    "Unbranded Y2K", "Unbranded Multicolour Styles", "Unbranded Colour-Block Styles",
    "Unbranded", "Mix Brand / Unbranded", "Graphic Design", "Unbranded Vintage",
}
LICENCES = {"NBA", "NFL", "NHL", "MLB", "Ivy League Names", "National Team Labels"}

def bs(style, label, brands):
    return {"style": style, "label": label, "brands": brands}

SECTIONS = [
  {
    "number": 1, "name": "T-Shirts", "menuColumn": "1",
    "intro": "Branded, graphic, heavyweight and vintage tees — from single stitch to Y2K era.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Branded / Logo T-Shirts", "Graphic / Printed T-Shirts", "Heavyweight / Workwear T-Shirts",
        "Sportswear / Performance / Technical T-Shirts", "Long-Sleeve T-Shirts", "Vintage Tees",
        "Y2K Era Tees", "Single Stitch Tees", "Football / Basketball Jerseys"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Ralph Lauren", "Lacoste", "Tommy Hilfiger", "Nautica", "Chaps", "U.S. Polo Assn.", "GAP"]),
        bs(SP, "Sportswear & Activewear", ["Adidas", "Nike", "Champion", "Reebok", "Puma", "Starter", "Jordan", "Lululemon", "Gymshark", "Under Armour", "Umbro", "Fila", "Russell Athletic"]),
        bs(OT, "Outdoor & Technical", ["Columbia", "The North Face", "L.L.Bean", "Patagonia"]),
        bs(WU, "Workwear & Utility", ["Carhartt", "Dickies"]),
        bs(ST, "Streetwear", ["Vans"]),
        bs(SB, "Surf & Beachwear", ["Rip Curl", "Billabong", "O'Neill", "Quiksilver", "Hurley", "Oakley"]),
    ],
    "descriptors": [
        {"group": "Design group", "kind": "design-group", "terms": ["Plain", "Small Logo", "Large Logo", "Spellout", "Graphic", "Pocket"]},
    ],
  },
  {
    "number": 2, "name": "Three Button Polos", "menuColumn": "1",
    "intro": "Piqué, golf and performance polos — small-logo classics to statement Big Pony.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Classic / Piqué Polos", "Performance / Golf Polos", "Activewear Polos", "Long-Sleeve Polos"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Lacoste", "Ralph Lauren", "Tommy Hilfiger"]),
        bs(SP, "Sportswear & Activewear", ["Lululemon", "Adidas", "Nike"]),
    ],
    "descriptors": [
        {"group": "Logo size", "kind": "descriptor", "terms": ["Small Logo", "Large / Statement Logo", "Country / Crest", "Spellout"]},
    ],
  },
  {
    "number": 3, "name": "Rugby Polos", "menuColumn": "1",
    "intro": "Striped, colour-block and official team rugby shirts, branded and unbranded.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Classic Striped Rugby Shirts", "Plain / Logo Rugby Shirts",
        "Colour-Block / Graphic Rugby Shirts", "Official Team Rugby Shirts"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Ralph Lauren", "GANT", "Brooks Brothers", "Tommy Hilfiger", "Lacoste", "Abercrombie & Fitch", "Nautica", "Chaps", "Levi's", "L.L.Bean", "U.S. Polo Assn.", "GAP", "Unbranded Multicolour Styles", "Unbranded Colour-Block Styles"]),
        bs(SP, "Sportswear & Activewear", ["Adidas", "Nike", "Canterbury", "Champion", "Ellesse", "Reebok", "Puma", "Starter", "Umbro", "Kappa", "Russell Athletic"]),
        bs(OT, "Outdoor & Technical", ["Columbia"]),
        bs(ST, "Streetwear", ["Vans"]),
        bs(FW, "Sports Fanwear & Official Merchandise — verified official only", ["Ivy League Names", "National Team Labels"]),
        bs(YV, "Y2K & Vintage", ["Unbranded Y2K"]),
    ],
    "descriptors": [],
  },
  {
    "number": 4, "name": "Shirts", "menuColumn": "1",
    "intro": "Oxfords, flannels, denim, work, camp-collar and Hawaiian shirts.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Classic / Casual / Button-Up / Button-Down Shirts", "Dress / Formal / Business Shirts",
        "Flannel / Checked / Plaid / Buffalo Check / Tartan Shirts", "Denim / Chambray Shirts",
        "Workwear / Utility Shirts", "Wool / Wool-Blend / Board Shirts",
        "Bowling / Camp-Collar / Cuban-Collar / Revere-Collar Shirts",
        "Hawaiian / Aloha / Resort / Tropical / Floral / Beach-Print Shirts",
        "Printed / Patterned / All-Over Print Shirts"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Ralph Lauren", "Tommy Hilfiger", "Lacoste", "J.Crew", "Brooks Brothers", "GANT", "Abercrombie & Fitch", "Nautica", "Charles Tyrwhitt", "BOSS", "HUGO", "COS"]),
        bs(SP, "Sportswear & Activewear", ["Lululemon"]),
        bs(OT, "Outdoor & Technical", ["Woolrich", "L.L.Bean", "Pendleton", "Columbia", "Patagonia", "Eddie Bauer"]),
        bs(WU, "Workwear & Utility", ["Carhartt", "Dickies", "Filson"]),
        bs(ST, "Streetwear", ["Carhartt WIP"]),
        bs(DN, "Denimwear", ["Levi's", "Wrangler"]),
        bs(SB, "Surf & Beachwear", ["Tommy Bahama", "Rip Curl", "Billabong", "O'Neill", "Oakley", "Quiksilver", "Hurley"]),
        bs(YV, "Assigned by garment style", ["Unbranded"]),
    ],
    "descriptors": [
        {"group": "Print / pattern", "kind": "design-group", "terms": ["Solid", "Vertical Stripe", "Check / Plaid", "All-Over Print", "Monogram", "Border Print", "Panel / Scenic Print", "Southwestern", "Geometric", "Floral"]},
        {"group": "Sleeve", "kind": "descriptor", "terms": ["Long Sleeve", "Short Sleeve"]},
    ],
  },
  {
    "number": 5, "name": "Shorts", "menuColumn": "1",
    "intro": "Chino, cargo, carpenter, athletic, swim and denim shorts — including Y2K embellished.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Chino / Smart Casual Shorts", "Cargo Shorts", "Workwear / Carpenter Shorts",
        "Drawstring / Elastic-Waist Casual Shorts", "Corduroy Shorts",
        "Athletic / Activewear / Training / Gym Shorts", "Basketball Shorts",
        "Sweat / Jersey / Fleece Shorts", "Running Shorts", "Swim Trunks / Board Shorts",
        "Denim Shorts / Jorts", "Women's Y2K Denim Shorts — Embellished / Embroidered / Rhinestoned",
        "Hip-Hop / Skatewear / Graphic / Baggy Denim Shorts"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Ralph Lauren", "Tommy Hilfiger", "Lacoste", "Nautica", "U.S. Polo Assn."]),
        bs(SP, "Sportswear & Activewear", ["Adidas", "Nike", "Champion", "Reebok", "Puma", "Starter", "Jordan", "Lululemon", "Gymshark", "Under Armour", "Umbro", "Russell Athletic"]),
        bs(OT, "Outdoor & Technical", ["Columbia", "The North Face", "L.L.Bean", "Patagonia"]),
        bs(WU, "Workwear & Utility", ["Carhartt", "Dickies"]),
        bs(ST, "Streetwear", ["Carhartt WIP", "Vans", "JNCO", "Evisu", "FUBU", "Southpole", "Akademiks", "Karl Kani", "Ecko", "Sean John", "Rocawear"]),
        bs(DN, "Denimwear", ["Levi's", "Lee", "Wrangler", "Miss Me", "Rock Revival", "True Religion"]),
        bs(SB, "Surf & Beachwear", ["Rip Curl", "Billabong", "O'Neill", "Oakley", "Quiksilver", "Hurley"]),
        bs(FW, "Sports Fanwear & Official Merchandise", ["NBA"]),
        bs(YV, "Y2K & Vintage", ["Unbranded Y2K"]),
    ],
    "descriptors": [
        {"group": "Length", "kind": "descriptor", "terms": ["Short / Cut-Off", "Mid-Thigh", "Above Knee", "Knee-Length / Bermuda"]},
        {"group": "Embellishment", "kind": "descriptor", "terms": ["Rhinestone", "Embroidered Pockets", "Flap Pockets", "Studded", "Contrast Stitching"]},
    ],
  },
  {
    "number": 6, "name": "Pants & Trousers", "menuColumn": "1",
    "intro": "Chinos, cargos, double-knee work pants, track pants, joggers and hiking trousers.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Chinos / Khakis", "Cargo / Casual Cargo Pants",
        "Carpenter / Painter / Utility / Workwear Pants", "Drawstring / Elastic-Waist Cotton Pants",
        "Double-Knee / Reinforced Work Pants", "Track Pants", "Woven Track / Windbreaker Pants",
        "Sweatpants / Joggers", "Training / Running Pants", "Football Club Track / Training Pants",
        "Golf / Tennis Performance Trousers", "Outdoor / Hiking Trousers",
        "Compression / Training Tights", "Tech Pants / Technical Trousers", "Bib Overalls / Dungarees",
        "Corduroy Trousers", "Ski / Insulated Trousers"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Ralph Lauren", "Tommy Hilfiger", "Lacoste", "Nautica", "Chaps", "U.S. Polo Assn.", "Dockers", "J.Crew", "GANT", "GAP", "Levi's", "Lee"]),
        bs(SP, "Sportswear & Activewear", ["Adidas", "Nike", "Champion", "Reebok", "Puma", "Jordan", "Under Armour", "Lululemon", "Gymshark", "Vuori", "Ellesse", "Fila", "Kappa", "Umbro", "Starter", "Russell Athletic"]),
        bs(OT, "Outdoor & Technical", ["Columbia", "The North Face", "L.L.Bean", "Patagonia", "Eddie Bauer", "Berghaus"]),
        bs(WU, "Workwear & Utility", ["Carhartt", "Dickies", "Wrangler"]),
        bs(ST, "Streetwear", ["Carhartt WIP"]),
    ],
    "descriptors": [
        {"group": "Fabric", "kind": "descriptor", "terms": ["Duck Canvas", "Twill", "Ripstop", "Polyester Tricot", "Fleece", "Corduroy", "Nylon Stretch"]},
        {"group": "Fit", "kind": "descriptor", "terms": ["Slim", "Regular", "Relaxed", "Loose / Baggy"]},
    ],
  },
  {
    "number": 7, "name": "Jeans & Denim Wear", "menuColumn": "1",
    "intro": "Classic Levi's to embellished Y2K statement denim — jeans, jorts and denim jackets.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Regular / Straight Jeans", "Slim / Skinny Jeans", "Relaxed / Loose Jeans",
        "Baggy / Wide-Leg / Hip-Hop / Skate Jeans", "Bootcut / Flared Jeans",
        "Y2K / Y2K-Style / McBling Jeans", "Mall Goth / Grunge Jeans",
        "Statement / Embellished / Embroidered / Rhinestoned / Studded Jeans",
        "Tattoo-Print / Tribal-Print Jeans", "Colour-Block / Contrast-Stitching Jeans",
        "Denim Jackets", "Truly Vintage Jeans & Denim Jackets"]}],
    "brandSets": [
        bs(DN, "Denimwear — Classic Everyday Denim", ["Levi's", "Lee", "Wrangler", "GAP", "Aeropostale"]),
        bs(DN, "Denimwear — Embellished & Statement Denim", ["Miss Me", "Rock Revival", "True Religion", "Diesel", "Miss Sixty", "Guess", "Vigoss"]),
        bs(ST, "Streetwear — Hip-Hop", ["Southpole", "FUBU", "Coogi", "Rocawear", "Baby Phat"]),
        bs(ST, "Streetwear — Skatewear", ["JNCO", "Empyre"]),
        bs(ST, "Streetwear — Contemporary / Alternative", ["Urban Outfitters", "Ed Hardy", "Affliction"]),
        bs(WU, "Workwear & Utility — Heritage Denim", ["Carhartt", "Dickies"]),
        bs(YV, "Y2K & Vintage — Y2K / McBling", ["Von Dutch", "bebe", "Angels", "Mudd"]),
        bs(YV, "Y2K & Vintage — 1990s Vintage", ["Old Navy"]),
    ],
    "descriptors": [
        {"group": "Rise", "kind": "descriptor", "terms": ["Low-Rise", "Mid-Rise", "High-Rise"]},
        {"group": "Wash", "kind": "descriptor", "terms": ["Light Wash", "Medium Wash", "Dark Wash", "Black Wash", "Distressed"]},
        {"group": "Embellishment", "kind": "descriptor", "terms": ["Rhinestone", "Embroidered", "Flap Pockets", "Fleur-de-Lis", "Horseshoe Pockets", "Studded", "Contrast Stitching", "Big T / Super T Stitch"]},
        {"group": "Fit", "kind": "descriptor", "terms": ["Straight", "Slim / Skinny", "Relaxed", "Baggy / Wide-Leg", "Bootcut / Flare"]},
    ],
  },
  {
    "number": 8, "name": "Sweatshirts & Hoodies", "menuColumn": "1",
    "intro": "Crewnecks, hoodies and zips — plain to spellout, college, band, motorsport and more.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Crewneck / Round-Neck Sweatshirts", "Pullover / Overhead Hoodies", "Zip-Up / Full-Zip Hoodies",
        "Half-Zip / Quarter-Zip Sweatshirts", "Full-Zip Sweatshirts — Without Hood"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Ralph Lauren", "Tommy Hilfiger", "Lacoste", "Nautica", "Chaps", "U.S. Polo Assn.", "GAP", "Levi's", "Lee"]),
        bs(SP, "Sportswear & Activewear", ["Nike", "Adidas", "Champion", "Reebok", "Puma", "Jordan", "Under Armour", "Lululemon", "Gymshark", "Alo", "Vuori", "Ellesse", "Fila", "Kappa", "Umbro", "Starter", "Russell Athletic"]),
        bs(OT, "Outdoor & Technical", ["Patagonia", "The North Face", "Columbia", "L.L.Bean", "Eddie Bauer"]),
        bs(WU, "Workwear & Utility", ["Carhartt", "Dickies"]),
        bs(ST, "Streetwear — Skatewear", ["Vans"]),
        bs(SB, "Surf & Beachwear", ["Rip Curl", "Billabong", "O'Neill", "Oakley", "Quiksilver", "Hurley"]),
        bs(FW, "Sports Fanwear & Official Merchandise", ["NHL", "NFL", "NBA", "MLB"]),
        bs(ST, "Graphic & Music Merchandise", ["Graphic Design"]),
        bs(YV, "Assigned by garment style", ["Unbranded"]),
    ],
    "descriptors": [
        {"group": "Design group", "kind": "design-group", "terms": ["Plain / Minimal", "Chest Logo / Small Logo", "Spellout", "Large Logo", "Graphic / Printed", "Theme-Led"]},
        {"group": "Graphic theme", "kind": "descriptor", "terms": ["University / College", "Sports Teams / Fanwear", "Music / Band / Tour", "Anime / Manga", "Disney / Cartoon / Character", "Comics / Superhero", "Movie / TV", "Video Games", "Motorsport / NASCAR / F1", "Motorcycle / Biker", "USA / Cities / Souvenir", "Nature / Wildlife"]},
    ],
  },
  {
    "number": 9, "name": "Knitwear", "menuColumn": "2",
    "intro": "Crew, V-neck, quarter-zip, cable and Fair Isle knits, cardigans and sweater vests.",
    "groups": [
        {"key": "A", "label": "Pullover Sweaters / Jumpers", "subcategories": [
            "Classic Crewneck / Round-Neck Sweaters", "V-Neck Sweaters",
            "Roll-Neck / Turtleneck / Mock-Neck Sweaters", "Half-Zip / Quarter-Zip Sweaters",
            "Knitted Polo / Polo-Collar Sweaters"]},
        {"key": "B", "label": "Cardigans / Full-Zip Knitwear", "subcategories": [
            "Classic / Button-Front Cardigans", "Full-Zip Cardigans / Full-Zip Knitwear"]},
        {"key": "C", "label": "Sleeveless Knitwear", "subcategories": [
            "Sweater Vests / Knitted Vests / Slipovers"]},
    ],
    "brandSets": [
        bs(CP, "Classic & Preppy / Ivy", ["Ralph Lauren", "Tommy Hilfiger", "Lacoste", "GANT", "Brooks Brothers", "Nautica", "Chaps", "U.S. Polo Assn."]),
        bs(OT, "Heritage Outdoor / Casual Knitwear", ["L.L.Bean", "Eddie Bauer", "Woolrich"]),
        bs(SP, "Athleisure / Contemporary Casual", ["Lululemon"]),
        bs(YV, "Y2K / Y2K-Style Knitwear", ["Unbranded Y2K"]),
    ],
    "descriptors": [
        {"group": "Knit construction", "kind": "descriptor", "terms": ["Cable-Knit", "Ribbed", "Textured", "3D-Textured", "Jacquard"]},
        {"group": "Knit gauge", "kind": "descriptor", "terms": ["Fine-Knit", "Chunky Knit"]},
        {"group": "Garment weight", "kind": "descriptor", "terms": ["Lightweight", "Midweight", "Heavyweight Knit"]},
        {"group": "Pattern / colour", "kind": "design-group", "terms": ["Fair Isle", "Nordic", "Argyle", "Geometric", "Striped", "Colour-Block"]},
        {"group": "Logo / graphic", "kind": "design-group", "terms": ["Minimal", "Small Logo", "Large Logo", "Statement", "Graphic Knit", "Character Knit", "Christmas / Holiday"]},
        {"group": "Heritage / preppy", "kind": "descriptor", "terms": ["Cricket", "Ivy", "Heritage", "Preppy", "Grandpa"]},
        {"group": "Statement style", "kind": "descriptor", "terms": ["Crazy / Funky", "Multicolour 3D Knit", "Coogi-Style"]},
        {"group": "Fibre", "kind": "descriptor", "terms": ["Cotton", "Wool Blend", "Cashmere Blend", "Acrylic"]},
        {"group": "Fit", "kind": "descriptor", "terms": ["Regular", "Oversized"]},
    ],
  },
  {
    "number": 10, "name": "Track Jackets", "menuColumn": "2",
    "intro": "Classic, velour, training and official football-club track jackets.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Classic Track Jackets", "Performance / Training Track Jackets", "Velour Track Jackets",
        "Official Football Club Track Jackets", "Team / Warm-Up Jackets"]}],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Lacoste", "Ralph Lauren", "Tommy Hilfiger"]),
        bs(SP, "Sportswear & Activewear", ["Adidas", "Nike", "Champion", "Reebok", "Puma", "Starter", "Jordan", "Lululemon", "Gymshark", "Under Armour", "Umbro", "Fila", "Kappa", "Russell Athletic", "New Balance", "ASICS"]),
        bs(OT, "Outdoor & Technical — Track Styles", ["Columbia", "The North Face"]),
        bs(YV, "Y2K / McBling — Velour Sportswear", ["Juicy Couture"]),
        bs(FW, "Sports Fanwear & Official Merchandise", ["NHL", "NFL", "NBA", "MLB"]),
    ],
    "descriptors": [
        {"group": "Design group", "kind": "design-group", "terms": ["Stripe-Detail", "Colour-Block", "Multicolour", "Chest Logo"]},
        {"group": "Fabric", "kind": "descriptor", "terms": ["Polyester Tricot", "Woven Polyester / Nylon", "Velour", "Lined"]},
    ],
  },
  {
    "number": 11, "name": "Fleece Jackets", "menuColumn": "2",
    "intro": "Polar, sherpa, Denali, Retro-X and technical fleece — the gorpcore essentials.",
    "groups": [{"key": "", "label": "", "subcategories": [
        "Classic / Polar Fleece", "Sherpa / High-Pile Fleece", "Sweater Fleece / Knit-Look Fleece",
        "Technical / Performance Fleece", "Panelled / Hybrid Fleece"]}],
    "brandSets": [
        bs(OT, "Outdoor & Technical / Gorpcore", ["Patagonia", "The North Face", "Columbia", "Berghaus", "L.L.Bean", "Eddie Bauer"]),
        bs(SP, "Sportswear & Activewear", ["Nike", "Adidas", "Lululemon"]),
        bs(YV, "Y2K Style", ["Unbranded Y2K"]),
        bs(OT, "Mixed — by garment style", ["Mix Brand / Unbranded"]),
    ],
    "descriptors": [
        {"group": "Design group", "kind": "design-group", "terms": ["Crazy", "Colour-Block", "All-Over Print", "Southwestern", "Tribal-Style"]},
        {"group": "Zip", "kind": "descriptor", "terms": ["Full-Zip", "Half / Quarter-Zip", "Snap Placket", "Pullover"]},
    ],
  },
  {
    "number": 12, "name": "Jackets", "menuColumn": "2",
    "intro": "Shells, 3-in-1s, work jackets, bombers, Harringtons, varsity and gilets. Puffers have their own section.",
    "groups": [
        {"key": "A", "label": "Lightweight / Technical / Shell Jackets", "subcategories": [
            "Windbreakers", "Rain Jackets / Waterproof Shells", "Softshell Jackets", "Anoraks / Pullover Jackets",
            "Ski / Snowboard Jackets", "3-in-1 / Removable-Liner Jackets"]},
        {"key": "B", "label": "Insulated / Winter Jackets", "subcategories": [
            "Quilted / Padded / Insulated Jackets", "Parkas / Outdoor Parkas / Winter Coats"]},
        {"key": "C", "label": "Casual / Bomber / Varsity Jackets", "subcategories": [
            "Coach Jackets", "Bomber / Flight Jackets", "Harrington / Blouson Jackets",
            "Varsity / Baseball Jackets", "Non-Denim Trucker Jackets", "Overshirts / Shirt Jackets / Shackets"]},
        {"key": "D", "label": "Workwear / Utility Jackets", "subcategories": [
            "Heavy Workwear / Duck-Canvas Jackets", "Lightweight Work / Utility Jackets"]},
        {"key": "E", "label": "Gilets / Vests / Bodywarmers", "subcategories": [
            "Puffer Gilets / Puffer Vests", "Quilted / Padded / Insulated Gilets",
            "Softshell / Performance Gilets", "Canvas / Workwear Vests"]},
    ],
    "brandSets": [
        bs(CP, "Classic & Preppy / Heritage Casual", ["Ralph Lauren", "Tommy Hilfiger", "Lacoste", "Nautica", "Chaps", "U.S. Polo Assn.", "GAP", "Barbour"]),
        bs(SP, "Sportswear & Activewear", ["Adidas", "Nike", "Champion", "Reebok", "Puma", "Jordan", "Under Armour", "Lululemon", "Gymshark", "Ellesse", "Fila", "Kappa", "Umbro", "Russell Athletic"]),
        bs(OT, "Outdoor & Technical / Heritage Outdoor", ["Patagonia", "The North Face", "Columbia", "Berghaus", "Jack Wolfskin", "Nike ACG", "Napapijri", "Oakley", "L.L.Bean", "Eddie Bauer", "Woolrich", "Timberland"]),
        bs(WU, "Workwear & Utility", ["Carhartt", "Dickies", "Levi's"]),
        bs(ST, "Streetwear / Skatewear / Urban Utility", ["Carhartt WIP", "Vans", "G-Star RAW"]),
        bs(SB, "Surf & Board Sports", ["Rip Curl", "Billabong", "O'Neill", "Quiksilver", "Hurley", "Volcom"]),
        bs(FW, "Sports Fanwear & Official Merchandise", ["Starter", "Mitchell & Ness", "Majestic", "NHL", "NFL", "NBA", "MLB"]),
        bs(YV, "Y2K Style", ["Unbranded Y2K"]),
    ],
    "descriptors": [
        {"group": "Material / fabric technology", "kind": "descriptor", "terms": ["Nylon", "Canvas", "Duck Canvas", "GORE-TEX", "DryVent / HyVent", "Softshell"]},
        {"group": "Hood", "kind": "descriptor", "terms": ["Hooded", "Detachable Hood", "No Hood"]},
        {"group": "Weather protection", "kind": "descriptor", "terms": ["Water-Resistant", "Wind-Resistant", "Waterproof"]},
        {"group": "Construction / design", "kind": "descriptor", "terms": ["Diamond-Quilt", "Multi-Pocket", "Colour-Block", "Lined"]},
        {"group": "Use / style", "kind": "descriptor", "terms": ["Technical", "Mountain", "Alpine", "Heritage Outdoor"]},
    ],
  },
  {
    "number": 13, "name": "Puffer Jackets", "menuColumn": "2",
    "intro": "Everyday, packable, expedition and long puffers — TNF Nuptse to Moncler, sorted by fill.",
    "groups": [
        {"key": "A", "label": "Classic / Everyday Puffers", "subcategories": ["Classic / Short Puffer Jackets"]},
        {"key": "B", "label": "Lightweight / Packable Puffers", "subcategories": ["Lightweight / Packable Puffer Jackets"]},
        {"key": "C", "label": "Heavyweight / Technical / Expedition Puffers", "subcategories": [
            "Heavyweight / Winter Puffer Jackets", "Technical / Performance Puffers",
            "Expedition / Mountaineering / Alpine Puffers"]},
        {"key": "D", "label": "Long Puffer Coats / Parkas", "subcategories": [
            "Long Puffer Coats / Puffer Parkas", "Technical / Expedition Puffer Coats / Down Parkas"]},
    ],
    "brandSets": [
        bs(CP, "Classic & Preppy", ["Ralph Lauren", "Tommy Hilfiger", "Lacoste", "Nautica", "Chaps", "U.S. Polo Assn."]),
        bs(SP, "Sportswear & Activewear", ["Adidas", "Nike", "Champion", "Reebok", "Puma", "Jordan", "Under Armour", "Lululemon", "Ellesse", "Fila", "Kappa", "Umbro", "Starter"]),
        bs(OT, "Outdoor & Technical / Heritage Outdoor", ["The North Face", "Patagonia", "Columbia", "Berghaus", "Montbell", "Canada Goose", "Jack Wolfskin", "Nike ACG", "Napapijri", "Eddie Bauer", "L.L.Bean"]),
        bs(LX, "Luxury / Alpine-Inspired Fashion", ["Moncler"]),
        bs(SB, "Surf & Snow / Board Sports", ["Quiksilver"]),
    ],
    "descriptors": [
        {"group": "Insulation", "kind": "descriptor", "terms": ["Down", "Synthetic"]},
        {"group": "Fill power", "kind": "descriptor", "terms": ["500 Fill", "550 Fill", "600 Fill", "650 Fill", "700 Fill", "800 Fill", "850 Fill", "900 Fill"]},
        {"group": "Length", "kind": "descriptor", "terms": ["Waist-Length", "Hip-Length", "Thigh-Length", "Knee-Length", "Full-Length"]},
        {"group": "Hood", "kind": "descriptor", "terms": ["Hooded", "Non-Hooded", "Detachable Hood"]},
        {"group": "Collar", "kind": "descriptor", "terms": ["High-Neck", "Funnel-Neck"]},
        {"group": "Construction", "kind": "descriptor", "terms": ["Baffled"]},
        {"group": "Fit / silhouette", "kind": "descriptor", "terms": ["Boxy", "Oversized"]},
        {"group": "Colour / design", "kind": "design-group", "terms": ["Colour-Block", "Solid"]},
        {"group": "Technical use", "kind": "descriptor", "terms": ["Ski", "Mountain", "Alpine", "Mountaineering", "Expedition", "Extreme-Cold"]},
        {"group": "Shell technology", "kind": "descriptor", "terms": ["HyVent", "DryVent", "Ripstop"]},
    ],
  },
  {
    "number": 14, "name": "Activewear & Athleisure", "menuColumn": "2",
    "intro": "Lululemon, Alo, Vuori and Gymshark — leggings, bras, tech tops, joggers and layers.",
    "groups": [
        {"key": "A", "label": "Leggings / Studio Essentials", "subcategories": [
            "Leggings / Yoga Pants / Training & Running Tights", "Flared / Bootcut Yoga Pants",
            "Biker / Cycling-Style / Fitted Workout Shorts", "Sports Bras / Longline Sports Bras",
            "Active Tanks / Crop Tops / Bra Tanks"]},
        {"key": "B", "label": "Training / Running / Court Apparel", "subcategories": [
            "Performance / Training T-Shirts", "Long-Sleeve / Technical Training Tops",
            "Performance / Golf / Tennis Polos", "Running / Training / Gym Shorts",
            "Tennis / Golf / Athletic Skirts & Skorts"]},
        {"key": "C", "label": "Joggers / Sweatpants / Lifestyle Bottoms", "subcategories": [
            "Performance / Training Joggers", "Sweatpants / Fleece Joggers / Lounge Pants",
            "Studio / Travel / Relaxed / Wide-Leg Pants", "Technical Casual / Commuter / Golf Trousers"]},
        {"key": "D", "label": "Sweatshirts / Hoodies / Active Layers", "subcategories": [
            "Crewneck / Half-Zip / Quarter-Zip Sweatshirts", "Pullover / Full-Zip Hoodies",
            "Fitted Studio / Training / Running Jackets", "Lightweight / Weather-Resistant Active Jackets"]},
        {"key": "E", "label": "Selected Additional Garments", "subcategories": [
            "Active / Tennis Dresses", "Workout Bodysuits / Unitards / One-Pieces",
            "Insulated Jackets / Puffers / Gilets", "Matching Sets / Coordinated Outfits"]},
    ],
    "brandSets": [
        bs(SP, "Yoga / Studio / Running / Everyday Athleisure", ["Lululemon"]),
        bs(SP, "Studio / Yoga / Fashion Athleisure", ["Alo"]),
        bs(SP, "Performance / Recovery / Everyday Athleisure", ["Vuori"]),
        bs(SP, "Gym / Strength Training / Fitness Athleisure", ["Gymshark"]),
    ],
    "descriptors": [
        {"group": "Use", "kind": "descriptor", "terms": ["Yoga / Studio", "Running", "Gym / Training", "Recovery / Lounge", "Golf / Tennis"]},
        {"group": "Fabric", "kind": "descriptor", "terms": ["Nulu / Buttery-Soft", "Compression", "Seamless", "Scuba / Cotton Fleece", "Technical Knit"]},
    ],
  },
  {
    "number": 15, "name": "Bags (Women)", "menuColumn": "2",
    "intro": "Coach, GG&L, Vintage Guess, Kathy Van Zeeland and more — everyday to McBling.",
    "groups": [
        {"key": "A", "label": "Shoulder / Everyday Bags", "subcategories": [
            "Classic Shoulder / Flap Bags", "Baguette / East–West Shoulder Bags", "Hobo / Slouch / Crescent Bags",
            "Crossbody / Camera / Messenger Bags", "Multi-Pocket / Cargo / Utility Bags"]},
        {"key": "B", "label": "Structured / Top-Handle Bags", "subcategories": [
            "Satchel / Structured Top-Handle Bags", "Bowling / Bowler / Barrel Bags", "Bucket / Drawstring Bags"]},
        {"key": "C", "label": "Totes / Carryalls", "subcategories": [
            "Tote / Shopper / Everyday Carryall Bags", "Foldaway / Packable Tote Bags"]},
        {"key": "D", "label": "Small / Occasion Bags", "subcategories": [
            "Clutch / Evening Bags", "Wristlet Bags / Small Carry Pouches"]},
        {"key": "E", "label": "Selected Additional Bags", "subcategories": [
            "Fashion Backpacks / Mini Backpacks", "Weekender / Travel Carryalls"]},
    ],
    "brandSets": [
        bs(CP, "Heritage Leather / Classic Casual", ["Coach", "Dooney & Bourke", "Longchamp"]),
        bs(YV, "Y2K Utility / McBling / Boho Glam", ["George Gina & Lucy", "Vintage Guess", "Kathy Van Zeeland", "Juicy Couture"]),
        bs(LX, "Contemporary Branded", ["Michael Kors", "Marc Jacobs", "Kate Spade"]),
        bs(YV, "Unbranded — Vintage / Y2K / Vintage Style / Y2K Style", ["Unbranded Vintage", "Unbranded Y2K"]),
        bs(LX, "Luxury — available on request", ["Dior", "Gucci", "Louis Vuitton"]),
    ],
    "descriptors": [
        {"group": "Size", "kind": "descriptor", "terms": ["Mini", "Small", "Medium", "Large", "Oversized"]},
        {"group": "Material", "kind": "descriptor", "terms": ["Leather", "Signature Canvas / Jacquard", "Nylon", "Denim", "Velour / Terry", "Faux Leather / Patent-Look"]},
        {"group": "Detail", "kind": "design-group", "terms": ["Monogram / Logo", "Buckle", "Studs", "Rhinestones", "Charms", "Metallic", "Animal Print", "Fringe", "Patchwork", "Embroidered"]},
        {"group": "Production", "kind": "descriptor", "terms": ["Original Production", "Later Reissue"]},
    ],
  },
]

# ---- Brand collections (dedicated assortments) --------------------------------
def col(brand, section, name, tier, desc, best):
    return {"brand": brand, "section": section, "name": name, "tier": tier, "description": desc, "bestSuitedFor": best}

COLLECTIONS = [
  # The North Face — puffers & down outerwear (catalogue §13)
  col("The North Face", 13, "TNF Puffers — Premium / Iconic / Vintage Era", "A. Premium / Iconic",
      "Nuptse / Baltoro / Himalayan / selected premium Summit Series. Recognisable model families, iconic silhouettes and selected premium technical down.",
      ["Streetwear resellers", "Outdoor & technical resellers", "Gorpcore resellers", "Specialist TNF buyers"]),
  col("The North Face", 13, "TNF Puffers — High-Value / High-Fill", "B. High-Fill 700–900",
      "700 / 800 / 850 / 900 fill power — verified specifications. Positioned by model, construction and condition.",
      ["Outdoor & technical resellers", "General branded resellers", "Premium winterwear sellers"]),
  col("The North Face", 13, "TNF Puffers — Core", "C. Core 550–650",
      "550 / 600 / 650 fill power — verified specifications. Everyday TNF down with broad branded-resale appeal.",
      ["General branded resellers", "Winterwear resellers", "Online & live sellers"]),
  col("The North Face", 13, "TNF Puffers — Standard", "D. Standard 500 / Synthetic",
      "500 fill power, standard down and synthetic-insulated (ThermoBall / Saikuru) styles.",
      ["General branded resellers", "Budget resellers", "Volume-focused sellers"]),
  col("The North Face", 13, "TNF Premium Long Down / Technical Outerwear", "E1. Premium Long",
      "Premium down parkas, technical insulated coats, higher-fill long puffers (McMurdo, Nuptse parka), expedition-inspired outerwear.",
      ["Outdoor & technical resellers", "Women-focused resellers", "Premium winterwear sellers"]),
  col("The North Face", 13, "TNF Core / Standard Long Outerwear", "E2. Core Long",
      "Standard long puffers, insulated parkas, mid-length and long winter coats.",
      ["General branded resellers", "Women-focused resellers", "Budget & volume winterwear sellers"]),
  col("The North Face", 12, "TNF Premium Down Vests", "F1. Premium Vests",
      "Recognisable premium models (1996 Retro Nuptse gilet), higher-fill down vests, selected vintage and technical variants.",
      ["Streetwear resellers", "Outdoor & technical resellers", "Premium branded resellers"]),
  col("The North Face", 12, "TNF Core / Standard Puffer Vests", "F2. Core Vests",
      "Everyday down and synthetic-insulated gilets with broad branded-resale appeal.",
      ["General branded resellers", "Budget resellers", "Transitional-season sellers"]),
  col("The North Face", 11, "TNF Denali Fleece", "Denali / Retro Denali",
      "Denali and Retro Denali colour-block fleece jackets and gilets with woven overlays.", ["Gorpcore resellers", "Outdoor & technical resellers"]),
  # Lululemon (§14)
  *[col("Lululemon", 14, f"Lululemon {n}", n, d, ["Activewear specialists", "Women's athleisure sellers", "Online & live sellers"]) for n, d in [
      ("Align", "Yoga leggings, fitted shorts, tanks, bras and selected flared styles."),
      ("Wunder Train / Wunder Under", "Leggings and fitted shorts, sorted by exact collection and fabric."),
      ("Fast and Free", "Running tights and running shorts."),
      ("Define", "Fitted full-zip jackets, cropped and hooded variants."),
      ("Scuba", "Full-zip and half-zip hoodies, funnel-neck sweatshirts, sweat bottoms."),
      ("Swiftly Tech / Metal Vent Tech", "Technical tanks, short-sleeve and long-sleeve tops."),
      ("Energy / Flow Y / Free to Be / Like a Cloud", "Sports bras and longline variants."),
      ("Hotty Hot / Speed Up / Pace Breaker", "Running and training shorts."),
      ("Dance Studio / Groove / Softstreme", "Studio pants, flared pants, relaxed bottoms and comfort layers."),
      ("ABC / Commission", "Technical casual trousers, selected joggers and shorts."),
      ("License to Train", "Training tops, shorts and joggers."),
      ("Steady State", "Sweatshirts, hoodies and sweatpants."),
      ("Archive / Older Designs", "Original-era flared yoga pants, distinctive waistbands, colour-block designs, older fitted jackets, discontinued styles."),
  ]],
  col("Alo", 14, "Alo — Brand-Specific", "Brand lot", "Studio separates, active layers and sweatwear.", ["Activewear specialists", "Women's athleisure sellers"]),
  col("Vuori", 14, "Vuori — Brand-Specific", "Brand lot", "Performance, recovery and lifestyle garments.", ["Activewear specialists", "Men's performance-casual sellers"]),
  col("Gymshark", 14, "Gymshark — Brand-Specific", "Brand lot", "Gym, seamless and training garments.", ["Activewear specialists", "Online & live sellers"]),
  # Coach (§15)
  col("Coach", 15, "Coach Vintage / Heritage Leather", "A. Vintage Leather",
      "Original-era leather shoulder, flap, crossbody, satchel and bucket bags. Model references where identified: City Bag / Court Bag / Station Bag / Willis.",
      ["Coach specialists", "Vintage leather sellers", "Online & live sellers"]),
  col("Coach", 15, "Coach Archive / Y2K Shoulder Bags", "B. Archive / Y2K",
      "Compact shoulder bags, buckle-flap styles, slouchy hobos, East–West shapes. Soho / Ergo / Hamptons / Legacy. Original production and reissues identified separately.",
      ["Coach specialists", "Y2K resellers", "Online & live sellers"]),
  col("Coach", 15, "Coach Signature Canvas / Jacquard", "C. Signature",
      "Signature C-pattern bags, leather-trimmed fabric bags, monogram shoulder bags, crossbodies, satchels and totes.",
      ["Coach specialists", "Contemporary branded resellers"]),
  col("Coach", 15, "Coach Contemporary Named Collections", "D. Contemporary",
      "Selected pre-owned Tabby / Swinger / Brooklyn and other identifiable collections.",
      ["Contemporary branded resellers", "Online & live sellers"]),
  col("Coach", 15, "Coach Everyday / Core", "E. Everyday",
      "Practical leather and signature-fabric crossbodies, shoulder bags, satchels and totes; retail and outlet lines identified.",
      ["Contemporary branded resellers", "Budget resellers"]),
  # GG&L
  *[col("George Gina & Lucy", 15, f"GG&L {n}", t, d, ["Y2K resellers", "Utility-fashion sellers", "GG&L specialists", "Online & live sellers"]) for n, t, d in [
      ("Signature Multi-Pocket / Utility", "A. Utility", "Nylon shoulder bags, cargo pockets, zip compartments, webbing straps, carabiner details."),
      ("Compact / Everyday", "B. Compact", "Small shoulder bags, crossbodies, compact utility bags."),
      ("Large / Carryall", "C. Carryall", "Oversized shoulder bags, shoppers, bowler bags, travel carryalls."),
      ("Archive / Colour / Print", "D. Archive", "Older production, distinctive colourways, metallics and prints. Mos Cowgirl / Paradise Angel / Double B."),
  ]],
  # Vintage Guess
  *[col("Vintage Guess", 15, f"Vintage Guess {n}", t, d, ["Vintage specialists", "Y2K & McBling resellers", "Fashion-led handbag sellers"]) for n, t, d in [
      ("Compact Shoulder / Baguette", "A. Baguette", "Short-strap shoulder bags, East–West shapes, compact flap bags. Original era only."),
      ("Signature / Monogram", "B. Monogram", "Original-era G-pattern, logo, jacquard and printed-fabric bags."),
      ("Denim / Textile / Mixed-Material", "C. Denim & Textile", "Denim bags, fabric-and-trim, patchwork and embroidered designs."),
      ("McBling / Statement", "D. McBling", "Buckles, studs, rhinestones, charms, metallic, patent-look and animal patterns."),
  ]],
  # Kathy Van Zeeland
  *[col("Kathy Van Zeeland", 15, f"Kathy Van Zeeland {n}", t, d, ["Y2K & McBling resellers", "Boho-fashion sellers", "Statement-bag specialists", "Online & live sellers"]) for n, t, d in [
      ("Signature Hardware / Charm", "A. Hardware & Charms", "Crown and heart motifs, logo plaques, chunky hardware, charm clusters."),
      ("Slouch / Hobo / Boho", "B. Hobo & Boho", "Soft shoulder bags, gathered shapes, buckle, stud or fringe details."),
      ("Metallic / Gloss / Embellished", "C. Metallic", "Metallic and patent-look finishes, rhinestones, croc-embossed textures, animal patterns."),
      ("Satchel / Tote / Everyday", "D. Everyday", "Structured and semi-structured satchels, shoulder totes, roomy everyday bags."),
  ]],
  col("Longchamp", 15, "Longchamp Le Pliage", "Le Pliage", "Le Pliage foldaway totes, short- and long-handle shoulder totes; selected leather and crossbody styles.", ["Handbag specialists", "Branded resale stores"]),
  col("Marc Jacobs", 15, "Marc Jacobs The Tote Bag / Snapshot", "Tote & Snapshot", "The Tote Bag, Snapshot, selected shoulder bags and older Marc by Marc Jacobs pieces.", ["Handbag specialists", "Contemporary branded resellers"]),
  col("Juicy Couture", 15, "Juicy Couture Original-Era Bags", "Original era", "Original-era velour, terry, logo and crest bags; contemporary Y2K-style pieces listed separately.", ["Y2K & McBling resellers", "Y2K boutiques"]),
  # From the brand catalogues
  col("Adidas", 10, "Adidas Firebird / SST / Beckenbauer", "Iconic track tops", "Firebird, SST and Beckenbauer-style polyester tricot track jackets.", ["Streetwear resellers", "Online & live sellers"]),
  col("Adidas", 10, "Adidas Retro Multicolour Track Jackets", "Retro", "Retro multicolour and lined retro track jackets.", ["Streetwear resellers", "Vintage shops"]),
  col("Adidas", 1, "Adidas Football & Basketball Jerseys", "Jerseys", "Retro and official football-club / national-team jerseys, vintage basketball jerseys.", ["Streetwear resellers", "Sports fanwear sellers"]),
  col("Adidas", 6, "Adidas Firebird / SST / Adibreak / Tiro Track Pants", "Track pants", "Firebird, SST, Adibreak and Tiro track and training pants; winterised and fleece variants.", ["Streetwear resellers", "Online & live sellers"]),
  col("Nike", 8, "Nike Tech Fleece / Club Fleece", "Fleece", "Tech Fleece hoodies and full-zips; Club Fleece small and big-logo hoodies and joggers.", ["Streetwear resellers", "Online & live sellers"]),
  col("Nike", 12, "Nike Windrunner", "Windrunner", "Lightweight Windrunner and windbreaker jackets.", ["Streetwear resellers", "General branded resellers"]),
  col("Nike", 1, "Nike Football & Basketball Jerseys", "Jerseys", "Official club / national-team, retro Total 90-style and basketball jerseys.", ["Streetwear resellers", "Sports fanwear sellers"]),
  col("Carhartt", 12, "Carhartt Detroit / Active / Chore Jackets", "Iconic work jackets", "Detroit, Active hooded and Chore / Michigan duck canvas jackets.", ["Streetwear resellers", "Workwear resellers", "Vintage shops"]),
  col("Carhartt", 6, "Carhartt Double-Knee / Carpenter Pants", "Work pants", "Double-knee, single-knee, carpenter and loose WIP work pants in duck canvas.", ["Streetwear resellers", "Workwear resellers"]),
  col("Dickies", 6, "Dickies 874 / Double-Knee Work Pants", "874 & double-knee", "Original 874, double-knee, skate and carpenter work pants.", ["Streetwear resellers", "Workwear resellers"]),
  col("Dickies", 12, "Dickies Eisenhower Jackets", "Eisenhower", "Eisenhower and lined Eisenhower work jackets.", ["Workwear resellers", "Vintage shops"]),
  col("Columbia", 12, "Columbia Bugaboo / Whirlibird 3-in-1", "3-in-1", "Bugaboo and Whirlibird Interchange jackets with removable liners.", ["Outdoor & technical resellers", "Gorpcore resellers"]),
  col("Columbia", 11, "Columbia Steens Mountain / Vintage Fleece", "Fleece", "Steens Mountain and vintage colour-block fleece jackets.", ["Gorpcore resellers", "Vintage shops"]),
  col("Columbia", 12, "Columbia Vintage Ski / Technical Shells", "Vintage ski", "Vintage colour-block ski and technical shell jackets.", ["Gorpcore resellers", "Vintage shops"]),
  col("Patagonia", 11, "Patagonia Retro-X / Retro Pile / Synchilla", "Heritage fleece", "Classic Retro-X, Retro Pile, Synchilla pullovers and Snap-T.", ["Gorpcore resellers", "Outdoor & technical resellers"]),
  col("Patagonia", 11, "Patagonia Better Sweater / R1", "Everyday & technical fleece", "Better Sweater full-zip / quarter-zip and R1 technical fleece.", ["Outdoor & technical resellers", "General branded resellers"]),
  col("Patagonia", 13, "Patagonia Down Sweater / Nano Puff", "Insulated", "Down Sweater and Nano Puff jackets and vests.", ["Outdoor & technical resellers", "Premium winterwear sellers"]),
  col("Levi's", 7, "Levi's 501 / 505 Straight", "501 / 505", "501 Original, heavyweight dark-wash 501 and 505 regular straight jeans.", ["Vintage shops", "Online & live sellers"]),
  col("Levi's", 7, "Levi's 550 / 560 / 569 Relaxed & Baggy", "Relaxed & baggy", "550, 560, 569 and 559 relaxed or baggy jeans.", ["Streetwear resellers", "Y2K boutiques"]),
  col("Levi's", 7, "Levi's Women's Ribcage / 725 / Wedgie", "Women's", "Ribcage, Wedgie, 501 and 725 / 726 bootcut or flare women's jeans.", ["Women-focused resellers", "Y2K boutiques"]),
  col("True Religion", 7, "True Religion Big T / Super T", "Big T / Super T", "Ricky, Joey, Becca, Billy, Geno and Rocco jeans with Big T / Super T stitching and horseshoe pockets.", ["Y2K boutiques", "Streetwear resellers"]),
  col("Rock Revival", 7, "Rock Revival Embellished Denim", "Statement", "Fleur-de-lis, embroidered and rhinestone flap-pocket jeans, jorts and jackets.", ["Y2K boutiques", "Y2K & McBling resellers"]),
  col("Miss Me", 7, "Miss Me Embellished Denim", "Statement", "Rhinestone, embroidered and flap-pocket bootcut, flare, straight and skinny jeans.", ["Y2K boutiques", "Women-focused resellers"]),
  col("Ralph Lauren", 2, "Ralph Lauren Big Pony / Statement Polos", "Big Pony", "Big Pony, maximalist Big Pony and Country / Crest statement piqué polos.", ["Streetwear resellers", "Vintage shops"]),
  col("Ralph Lauren", 9, "Ralph Lauren Polo Bear / Flag Knits", "Statement knits", "Polo Bear, Flag and Crest statement knitwear.", ["Vintage shops", "Premium branded resellers"]),
  col("Ralph Lauren", 12, "Ralph Lauren Polo Sport / Archive Jackets", "Archive", "Polo Sport, Country Flag, Sailing and Racing archive jackets.", ["Vintage shops", "Streetwear resellers"]),
  col("Tommy Hilfiger", 12, "Tommy Hilfiger Archive / Flag Jackets", "Archive", "Sailing, Flag, Spellout and colour-block archive jackets.", ["Vintage shops", "Y2K boutiques"]),
  col("Lacoste", 2, "Lacoste Large Crocodile / Statement", "Statement", "Large crocodile statement polos, tees and Lacoste Sport sweatshirts.", ["Streetwear resellers", "Vintage shops"]),
]

LUXURY_ON_REQUEST = {"Dior", "Gucci", "Louis Vuitton"}
FEATURED = ["The North Face", "Carhartt", "Ralph Lauren", "Nike", "Adidas", "Patagonia", "Levi's", "Lululemon",
            "Tommy Hilfiger", "Lacoste", "Dickies", "Columbia", "True Religion", "Coach", "Miss Me", "Rock Revival"]

BUYER_TYPES = [
    "Online & live sellers", "Streetwear resellers", "Vintage shops", "Y2K boutiques", "Market traders",
    "International importers", "Outdoor & technical resellers", "Gorpcore resellers", "Specialist TNF buyers",
    "General branded resellers", "Premium winterwear sellers", "Winterwear resellers", "Budget resellers",
    "Volume-focused sellers", "Women-focused resellers", "Budget & volume winterwear sellers",
    "Premium branded resellers", "Transitional-season sellers", "Activewear specialists", "Branded resale stores",
    "Women's athleisure sellers", "Men's performance-casual sellers", "Coach specialists", "Vintage leather sellers",
    "Contemporary branded resellers", "Y2K resellers", "Utility-fashion sellers", "GG&L specialists",
    "Vintage specialists", "Y2K & McBling resellers", "Fashion-led handbag sellers", "Boho-fashion sellers",
    "Statement-bag specialists", "Style-led resellers", "Budget-fashion sellers", "Handbag specialists",
    "Vintage & Y2K resellers", "Fashion boutiques", "Workwear resellers", "Sports fanwear sellers",
]

def main():
    brands = {}
    for s in SECTIONS:
        for set_ in s["brandSets"]:
            for b in set_["brands"]:
                e = brands.setdefault(b, {"name": b, "styles": [], "sections": []})
                if set_["style"] not in e["styles"]:
                    e["styles"].append(set_["style"])
                if s["number"] not in e["sections"]:
                    e["sections"].append(s["number"])
    for c in COLLECTIONS:
        assert c["brand"] in brands, f"collection brand missing from sections: {c['brand']}"
        for bt in c["bestSuitedFor"]:
            assert bt in BUYER_TYPES, f"unknown buyer type: {bt}"
    out_brands = []
    for name, e in sorted(brands.items(), key=lambda kv: kv[0].lower()):
        kind = "stock-group" if name in STOCK_GROUPS else "licence" if name in LICENCES else "brand"
        out_brands.append({**e, "kind": kind, "featured": name in FEATURED,
                           "luxuryOnRequest": name in LUXURY_ON_REQUEST})
    data = {
        "_readme": "GENERATED by seed/source/build_taxonomy.py from the 360 Thrift Studio catalogue and brand catalogues. Edit the script, not this file.",
        "business": {"name": "360° Thrift Studio", "tagline": "Vintage · Premium · Wholesale",
                      "locations": ["United Kingdom", "Pakistan"]},
        "fashionCategories": [{"name": n, "description": d} for n, d in STYLES],
        "buyerTypes": BUYER_TYPES,
        "sections": SECTIONS,
        "brands": out_brands,
        "brandCollections": COLLECTIONS,
    }
    path = os.path.join(os.path.dirname(__file__), "..", "taxonomy.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    subs = sum(len(g["subcategories"]) for s in SECTIONS for g in s["groups"])
    terms = sum(len(d["terms"]) for s in SECTIONS for d in s["descriptors"])
    print(f"{len(SECTIONS)} sections, {subs} subcategories, {len(out_brands)} brands/stock groups, "
          f"{len(COLLECTIONS)} collections, {terms} descriptor terms, {len(BUYER_TYPES)} buyer types")

if __name__ == "__main__":
    main()
