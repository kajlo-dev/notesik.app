const COFFEE_URL = 'https://buycoffee.to/kajlo.dev'

export function CoffeeBanner() {
  return (
    <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="coffee-banner">
      ☕ Postaw kawę Marcinowi
    </a>
  )
}
