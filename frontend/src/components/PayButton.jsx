/**
 * components/PayButton.jsx
 * Drop this anywhere something is payable — a rent row on the tenant's
 * dashboard, a confirmed maintenance booking, a utility assistance
 * request, a shared-bill balance — and it routes to the centralized
 * payment page with the right context already filled in.
 *
 * Example:
 *   <PayButton
 *     serviceType="rent"
 *     referenceId={tenancy.id}
 *     amount={tenancy.rent_amount}
 *     title={`Rent — ${tenancy.listing_title}`}
 *   />
 */
import { useNavigate } from 'react-router-dom'

const PayButton = ({ serviceType, referenceId, amount, title, className = '', children }) => {
  const navigate = useNavigate()

  const handleClick = () => {
    const params = new URLSearchParams({
      service_type: serviceType,
      reference_id: referenceId ?? '',
      amount: amount ?? '',
      title: title ?? '',
    })
    navigate(`/payment?${params.toString()}`)
  }

  return (
    <button
      onClick={handleClick}
      className={
        className ||
        'px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg transition-all shadow-sm'
      }
    >
      {children || 'Pay Now'}
    </button>
  )
}

export default PayButton