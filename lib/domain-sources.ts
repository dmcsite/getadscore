// Curated DTC brand domains by niche
// These are mid-tier brands likely to benefit from GetAdScore

export const NICHE_DOMAINS: Record<string, string[]> = {
  "supplements": [
    "zbiotics.com",
    "yoursuper.com",
    "livewholier.com",
    "gowellpath.com",
    "vitl.com",
    "uqora.com",
    "umzu.com",
    "takethesis.com",
    "thenueco.com",
    "sunwarrior.com",
    "seed.com",
    "rootine.co",
    "raewellness.co",
    "youcanpym.com",
    "getproper.com",
    "prima.co",
    "personanutrition.com",
    "liveowyn.com",
    "organifi.com",
    "gainful.com",
    "careofvitamins.com",
    "moonjuice.com",
    "sakara.com",
    "humann.com",
    "foursigmatic.com",
    "liquidiv.com",
    "drinklmnt.com",
    "nuun.com",
    "skratchlabs.com",
    "ritual.com",
    "huel.com",
    "kaged.com",
    "legionathletics.com",
    "transparentlabs.com",
    "momentous.com",
    "athleticgreens.com",
  ],
  "skincare": [
    "curology.com",
    "kosas.com",
    "iliabeauty.com",
    "tula.com",
    "versedskin.com",
    "youthtothepeople.com",
    "tower28beauty.com",
    "milkmakeup.com",
    "beautyofjoseon.com",
    "typology.com",
    "primallypure.com",
    "rhode.com",
    "saltandstone.com",
    "koraorganics.com",
    "touchland.com",
    "coola.com",
    "naturium.com",
    "saltair.com",
    "oseamalibu.com",
    "sundayriley.com",
    "drunkelephant.com",
    "tatcha.com",
    "summerfridays.com",
    "peaceoutskincare.com",
    "supergoop.com",
    "glowrecipe.com",
    "biossance.com",
    "beekman1802.com",
    "farmacybeauty.com",
    "alpynbeauty.com",
    "herbivorebotanicals.com",
    "cocokind.com",
    "truebotanicals.com",
    "olehenriksen.com",
    "innbeauty.com",
  ],
  "beauty": [
    "glossier.com",
    "itsblume.com",
    "glamnetic.com",
    "indielee.com",
    "threeshipsbeauty.com",
    "koparibeauty.com",
    "saturdayskin.com",
    "dedcool.com",
    "skylar.com",
    "juviasplace.com",
    "fentybeauty.com",
    "rarebeauty.com",
    "patmcgrath.com",
    "hauslabs.com",
    "merit.com",
    "westmanatelier.com",
    "roseinc.com",
    "jonesroadbeauty.com",
    "saiebeauty.com",
    "aboutface.com",
  ],
  "health/wellness": [
    "mudwtr.com",
    "drinkag1.com",
    "calm.com",
    "headspace.com",
    "whoop.com",
    "ouraring.com",
    "eightsleep.com",
    "chilisleep.com",
    "joovv.com",
    "theragun.com",
    "hyperice.com",
    "normatec.com",
    "floatpod.com",
    "mindbodygreen.com",
    "wellnisse.com",
  ],
  "food/drink": [
    "drinktru.com",
    "drinkmoment.com",
    "shopflavcity.com",
    "rxbar.com",
    "perfectbar.com",
    "gomacro.com",
    "larabar.com",
    "kindsnacks.com",
    "lesserevil.com",
    "sietefoods.com",
    "partakefoods.com",
    "simplemills.com",
    "hukitchen.com",
    "foragedish.com",
    "dailyharvest.com",
    "splendidspoon.com",
    "factor75.com",
    "trifectanutrition.com",
    "mealime.com",
    "eatreal.com",
  ],
  "pet": [
    "thefarmersdog.com",
    "myollie.com",
    "justfoodfordogs.com",
    "sundaysforpets.com",
    "butternutbox.com",
    "petplate.com",
    "spotandtango.com",
    "openfarm.com",
    "stellaandchewys.com",
    "primalpetfoods.com",
    "natureslogic.com",
    "ziwipeak.com",
    "acana.com",
    "orijen.com",
    "barkbox.com",
    "chewy.com",
    "wildone.com",
    "fidobrooklyn.com",
    "maxbone.com",
    "wagz.com",
  ],
  "fashion": [
    "allbirds.com",
    "everlane.com",
    "reformation.com",
    "betabrand.com",
    "outdoorvoices.com",
    "buckmason.com",
    "bonobos.com",
    "rothys.com",
    "girlfriendcollective.com",
    "tentree.com",
    "reiss.com",
    "cosstores.com",
    "vettacapsule.com",
    "elizabethsuzann.com",
    "lacausa.com",
    "christydawn.com",
    "doenandersen.com",
    "pistolalake.com",
    "westernrise.com",
    "taylorstitch.com",
  ],
  "home/kitchen": [
    "ourplace.com",
    "madein.com",
    "caraway.com",
    "greenpan.com",
    "misen.com",
    "hestan.com",
    "smithey.com",
    "yamazakihome.com",
    "vitsoe.com",
    "great-jones.com",
    "staub.com",
    "le-creuset.com",
    "zwilling.com",
    "materialkitchen.com",
    "hexclad.com",
    "brooklinen.com",
    "parachutehome.com",
    "burrow.com",
    "article.com",
    "floydhome.com",
  ],
};

// Get domains for a niche, excluding already processed ones
export function getDomainsForNiche(
  niche: string,
  excludeDomains: string[] = [],
  limit?: number
): string[] {
  const normalizedNiche = niche.toLowerCase().replace(/\s+/g, "/");

  // Find matching niche (support partial matches)
  const nicheKey = Object.keys(NICHE_DOMAINS).find(
    (key) => key.includes(normalizedNiche) || normalizedNiche.includes(key)
  );

  if (!nicheKey) {
    return [];
  }

  const domains = NICHE_DOMAINS[nicheKey].filter(
    (domain) => !excludeDomains.includes(domain)
  );

  // Shuffle for variety
  const shuffled = domains.sort(() => Math.random() - 0.5);

  return limit ? shuffled.slice(0, limit) : shuffled;
}

// Get all available niches
export function getAvailableNiches(): string[] {
  return Object.keys(NICHE_DOMAINS);
}

// Add domains to a niche (for future expansion)
export function addDomainsToNiche(niche: string, domains: string[]): void {
  if (!NICHE_DOMAINS[niche]) {
    NICHE_DOMAINS[niche] = [];
  }
  NICHE_DOMAINS[niche].push(...domains);
}
