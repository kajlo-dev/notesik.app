import coffeeIcon from '../assets/icons/buycoffee-icon.svg'

const COFFEE_URL = 'https://buycoffee.to/kajlo.dev'

export function CoffeeBanner() {
  return (
    <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="coffee-banner">
      <img src={coffeeIcon} alt="" width="26" height="16" />
      Postaw kawę Marcinowi
    </a>
  )
}
