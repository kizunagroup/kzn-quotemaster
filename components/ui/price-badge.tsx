"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";

export interface PriceBadgeProps {
  price: number;
  currency?: string;
  isBestPrice?: boolean;
  showCurrency?: boolean;
  showBestPriceIcon?: boolean;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
  size?: "sm" | "default" | "lg";
}

/**
 * Format price as Vietnamese currency
 */
function formatVietnameseCurrency(
  amount: number,
  currency: string = "VND",
  showCurrency: boolean = true
): string {
  // Format number with thousands separators
  const formattedNumber = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  if (!showCurrency) {
    return formattedNumber;
  }

  // Add Vietnamese currency symbol
  switch (currency.toUpperCase()) {
    case "VND":
    case "DONG":
      return `${formattedNumber} ₫`;
    case "USD":
      return `$${formattedNumber}`;
    case "EUR":
      return `€${formattedNumber}`;
    default:
      return `${formattedNumber} ${currency}`;
  }
}

export function PriceBadge({
  price,
  currency = "VND",
  isBestPrice = false,
  showCurrency = true,
  showBestPriceIcon = true,
  className,
  variant,
  size = "default",
}: PriceBadgeProps) {
  // Determine badge variant based on best price status
  const badgeVariant = variant || (isBestPrice ? "default" : "secondary");

  // Size-based classes
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    default: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    default: "h-4 w-4",
    lg: "h-5 w-5",
  };

  // Format the price
  const formattedPrice = formatVietnameseCurrency(price, currency, showCurrency);

  return (
    <Badge
      variant={badgeVariant}
      className={cn(
        sizeClasses[size],
        "font-mono font-medium",
        isBestPrice && [
          "bg-green-100 text-green-800 border-green-200",
          "dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
          "shadow-sm",
        ],
        className
      )}
    >
      <div className="flex items-center gap-1">
        {isBestPrice && showBestPriceIcon && (
          <TrendingDown className={cn(iconSizeClasses[size], "text-green-600 dark:text-green-400")} />
        )}
        <span>{formattedPrice}</span>
      </div>
    </Badge>
  );
}

// Specialized variants for common use cases
export function BestPriceBadge({
  price,
  currency = "VND",
  showCurrency = true,
  className,
  size = "default",
}: Omit<PriceBadgeProps, "isBestPrice" | "variant">) {
  return (
    <PriceBadge
      price={price}
      currency={currency}
      isBestPrice={true}
      showCurrency={showCurrency}
      className={className}
      size={size}
    />
  );
}

export function RegularPriceBadge({
  price,
  currency = "VND",
  showCurrency = true,
  className,
  size = "default",
}: Omit<PriceBadgeProps, "isBestPrice" | "variant">) {
  return (
    <PriceBadge
      price={price}
      currency={currency}
      isBestPrice={false}
      showCurrency={showCurrency}
      variant="outline"
      className={className}
      size={size}
    />
  );
}

// Price comparison component showing multiple prices
export interface PriceComparisonProps {
  prices: Array<{
    label: string;
    price: number;
    isBest?: boolean;
  }>;
  currency?: string;
  showCurrency?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function PriceComparison({
  prices,
  currency = "VND",
  showCurrency = true,
  className,
  size = "default",
}: PriceComparisonProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {prices.map((priceItem, index) => (
        <div key={index} className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">{priceItem.label}</span>
          <PriceBadge
            price={priceItem.price}
            currency={currency}
            isBestPrice={priceItem.isBest || false}
            showCurrency={showCurrency}
            size={size}
          />
        </div>
      ))}
    </div>
  );
}

// Utility function for external use
export { formatVietnameseCurrency };

export default PriceBadge;