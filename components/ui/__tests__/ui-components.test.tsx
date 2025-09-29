import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PriceBadge, BestPriceBadge, RegularPriceBadge, PriceComparison, formatVietnameseCurrency } from '../price-badge';

// Mock the server action
jest.mock('@/lib/actions/quotations.actions', () => ({
  getAvailableRegions: jest.fn(() => Promise.resolve(['Hà Nội', 'TP.HCM', 'Đà Nẵng']))
}));

describe('PriceBadge Component', () => {
  describe('formatVietnameseCurrency', () => {
    it('should format VND currency correctly', () => {
      expect(formatVietnameseCurrency(1000000)).toBe('1.000.000 ₫');
      expect(formatVietnameseCurrency(500000)).toBe('500.000 ₫');
      expect(formatVietnameseCurrency(1250000)).toBe('1.250.000 ₫');
    });

    it('should format without currency symbol when showCurrency is false', () => {
      expect(formatVietnameseCurrency(1000000, 'VND', false)).toBe('1.000.000');
    });

    it('should handle different currencies', () => {
      expect(formatVietnameseCurrency(1000, 'USD')).toBe('$1.000');
      expect(formatVietnameseCurrency(1000, 'EUR')).toBe('€1.000');
      expect(formatVietnameseCurrency(1000, 'JPY')).toBe('1.000 JPY');
    });

    it('should handle zero and negative values', () => {
      expect(formatVietnameseCurrency(0)).toBe('0 ₫');
      expect(formatVietnameseCurrency(-1000)).toBe('-1.000 ₫');
    });
  });

  describe('PriceBadge', () => {
    it('should render price correctly', () => {
      render(<PriceBadge price={1000000} />);
      expect(screen.getByText('1.000.000 ₫')).toBeInTheDocument();
    });

    it('should show best price styling when isBestPrice is true', () => {
      render(<PriceBadge price={500000} isBestPrice={true} />);
      const badge = screen.getByText('500.000 ₫').closest('span');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should not show best price styling when isBestPrice is false', () => {
      render(<PriceBadge price={500000} isBestPrice={false} />);
      const badge = screen.getByText('500.000 ₫').closest('span');
      expect(badge).not.toHaveClass('bg-green-100');
    });

    it('should render without currency when showCurrency is false', () => {
      render(<PriceBadge price={1000000} showCurrency={false} />);
      expect(screen.getByText('1.000.000')).toBeInTheDocument();
      expect(screen.queryByText('1.000.000 ₫')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<PriceBadge price={1000000} className="custom-class" />);
      const badge = screen.getByText('1.000.000 ₫').closest('span');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('BestPriceBadge', () => {
    it('should render as best price by default', () => {
      render(<BestPriceBadge price={750000} />);
      const badge = screen.getByText('750.000 ₫').closest('span');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should show trending down icon', () => {
      render(<BestPriceBadge price={750000} />);
      // The icon should be present (we can't easily test for specific icons in unit tests)
      const badge = screen.getByText('750.000 ₫').closest('span');
      expect(badge?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('RegularPriceBadge', () => {
    it('should render with outline variant', () => {
      render(<RegularPriceBadge price={850000} />);
      const badge = screen.getByText('850.000 ₫').closest('span');
      expect(badge).not.toHaveClass('bg-green-100');
    });
  });

  describe('PriceComparison', () => {
    const mockPrices = [
      { label: 'NCC A', price: 1000000, isBest: true },
      { label: 'NCC B', price: 1100000, isBest: false },
      { label: 'NCC C', price: 950000, isBest: false }
    ];

    it('should render all price items', () => {
      render(<PriceComparison prices={mockPrices} />);

      expect(screen.getByText('NCC A')).toBeInTheDocument();
      expect(screen.getByText('NCC B')).toBeInTheDocument();
      expect(screen.getByText('NCC C')).toBeInTheDocument();

      expect(screen.getByText('1.000.000 ₫')).toBeInTheDocument();
      expect(screen.getByText('1.100.000 ₫')).toBeInTheDocument();
      expect(screen.getByText('950.000 ₫')).toBeInTheDocument();
    });

    it('should highlight best price correctly', () => {
      render(<PriceComparison prices={mockPrices} />);

      // Find the badge for NCC A (best price)
      const bestPriceBadge = screen.getByText('1.000.000 ₫').closest('span');
      expect(bestPriceBadge).toHaveClass('bg-green-100');

      // Find badges for other suppliers (not best price)
      const regularBadge1 = screen.getByText('1.100.000 ₫').closest('span');
      const regularBadge2 = screen.getByText('950.000 ₫').closest('span');
      expect(regularBadge1).not.toHaveClass('bg-green-100');
      expect(regularBadge2).not.toHaveClass('bg-green-100');
    });
  });
});

describe('RegionAutocomplete Component', () => {
  // Note: Full testing of RegionAutocomplete would require more complex setup
  // due to its async nature and use of server actions. In a real project,
  // you would use tools like MSW (Mock Service Worker) to mock the server actions.

  it('should be importable without errors', () => {
    // This is a basic smoke test to ensure the component can be imported
    const RegionAutocomplete = require('../region-autocomplete').RegionAutocomplete;
    expect(RegionAutocomplete).toBeDefined();
  });
});

// Integration test example (would run in a more complex test environment)
describe('UI Components Integration', () => {
  it('should work together in a form scenario', () => {
    const FormExample = () => {
      const [region, setRegion] = React.useState('');
      const [price] = React.useState(1250000);

      return (
        <div>
          <div data-testid="region-value">{region}</div>
          <PriceBadge price={price} isBestPrice={true} />
          <button onClick={() => setRegion('Hà Nội')}>Set Region</button>
        </div>
      );
    };

    render(<FormExample />);
    expect(screen.getByText('1.250.000 ₫')).toBeInTheDocument();
  });
});