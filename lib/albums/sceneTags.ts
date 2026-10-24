/**
 * ImageNet label -> album scene tags. Pure function, fully tested.
 * Rules run over the classifier's top labels (most confident first):
 * the first matching rule wins per label, and tags keep first-seen order.
 * Anything with no match keeps the generic 'things' tag so every photo
 * lands in at least one scene album.
 */
const RULES: { tag: string; match: RegExp }[] = [
  { tag: 'beach', match: /beach|seashore|coast|sandbar|lakeside|pier|breakwater|promontory|gondola|catamaran|speedboat|yawl/ },
  { tag: 'nature', match: /mountain|valley|alp|cliff|forest|redwood|mushroom|daisy|tulip|rose|sunflower|bee|butterfly|waterfall|geyser|volcano|coral|jellyfish|starfish|seascape|hay|acorn|pine/ },
  { tag: 'food', match: /pizza|burger|cheeseburger|sushi|espresso|coffee|cafe|restaurant|burrito|hotdog|pretzel|bagel|pancake|waffle|ice cream|gelato|cake|bakery|plate|menu|soup|salad|sandwich|taco|curry|noodle|pasta|steak|barbecue|wine|beer|champagne|mug|teapot|kettle|frying pan|grill|bakery|patisserie/ },
  { tag: 'city', match: /street|bridge|suspension|skyscraper|tower|church|cathedral|castle|palace|mosque|monastery|dome|viaduct|arch|traffic|streetcar|trolleybus|bus|police van|taxi|limousine|parking|downtown|metropolis|city/ },
  { tag: 'animals', match: /dog|cat|bird|horse|cow|sheep|pig|elephant|lion|tiger|bear|fox|wolf|deer|rabbit|monkey|panda|penguin|duck|goose|chicken|fish|shark|whale|dolphin|snake|lizard|frog|turtle|crab|lobster|spider|ant|beetle|grasshopper/ },
  { tag: 'people', match: /person|man|woman|boy|girl|child|baby|bride|groom|scuba|snorkel|skier|surfer|player|athlete|dancer|actor|clown|ballplayer|groom/ },
];

export function mapLabelsToTags(labels: string[]): string[] {
  const tags: string[] = [];
  for (const label of labels) {
    const lower = label.toLowerCase();
    for (const rule of RULES) {
      if (rule.match.test(lower)) {
        if (!tags.includes(rule.tag)) tags.push(rule.tag);
        break;
      }
    }
  }
  if (tags.length === 0) tags.push('things');
  return tags;
}
