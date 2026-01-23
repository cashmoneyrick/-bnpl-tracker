import { Card } from '../shared/Card';
import {
  useTotalOwed,
  useTotalAvailableCredit,
  useMonthlyOutgoing,
} from '../../store/selectors';
import { formatCurrency } from '../../utils/currency';

export function SummaryCards() {
  const totalOwed = useTotalOwed();
  const availableCredit = useTotalAvailableCredit();
  const monthlyOutgoing = useMonthlyOutgoing();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Owed */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">Total Owed</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(totalOwed)}
            </p>
          </div>
          <div className="p-2 bg-red-500/10 rounded-lg">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </Card>

      {/* Available Credit */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">Available Credit</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(availableCredit)}
            </p>
          </div>
          <div className="p-2 bg-green-500/10 rounded-lg">
            <svg
              className="w-6 h-6 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </Card>

      {/* This Month's Outgoing */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">This Month</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(monthlyOutgoing)}
            </p>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      </Card>
    </div>
  );
}
