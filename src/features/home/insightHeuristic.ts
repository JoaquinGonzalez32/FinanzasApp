/**
 * Heuristic insight generator. Picks the single most-relevant takeaway
 * from current month state. Designed to be drop-in replaceable by an
 * AI-generated insight in a follow-up phase.
 */

export interface InsightInput {
    monthExpense: number;
    monthIncome: number;
    plannedTotal: number; // total budgeted
    daysIntoMonth: number; // 1..31
    daysInMonth: number;
    primaryCurrency?: string;
    topOverCategory?: { name: string; pct: number } | null;
}

export interface Insight {
    title: string;
    body?: string;
    icon?: string;
    tone: 'info' | 'good' | 'warning' | 'danger';
}

export function computeInsight(input: InsightInput): Insight | null {
    const {
        monthExpense,
        monthIncome,
        plannedTotal,
        daysIntoMonth,
        daysInMonth,
        topOverCategory,
    } = input;

    // No baseline yet
    if (plannedTotal <= 0 && monthExpense === 0 && monthIncome === 0) return null;

    // Critical: a category is over 100%
    if (topOverCategory && topOverCategory.pct >= 100) {
        return {
            title: `${topOverCategory.name} se pasó del presupuesto`,
            body: `Estás ${Math.round(topOverCategory.pct - 100)}% por encima. Reasigná o reducí.`,
            tone: 'danger',
            icon: 'error-outline',
        };
    }

    // Pace check: spent share vs day share
    if (plannedTotal > 0) {
        const spentShare = monthExpense / plannedTotal;
        const dayShare = daysIntoMonth / daysInMonth;
        const diff = spentShare - dayShare;

        if (diff > 0.15) {
            const pct = Math.round(spentShare * 100);
            return {
                title: `Vas adelantado en gasto: ${pct}%`,
                body: `Llevás ${pct}% del presupuesto y solo pasó el ${Math.round(dayShare * 100)}% del mes.`,
                tone: 'warning',
                icon: 'trending-up',
            };
        }

        if (diff < -0.15 && spentShare >= 0.2) {
            const saved = plannedTotal * dayShare - monthExpense;
            return {
                title: `Vas mejor que el promedio del mes`,
                body: `Llevás ${Math.round(saved).toLocaleString('es-UY')} menos que lo proyectado a esta altura.`,
                tone: 'good',
                icon: 'savings',
            };
        }
    }

    // Cushion if income known
    if (monthIncome > 0 && monthExpense > 0) {
        const savingsRate = (monthIncome - monthExpense) / monthIncome;
        if (savingsRate > 0.3) {
            return {
                title: `Estás ahorrando ${Math.round(savingsRate * 100)}% este mes`,
                tone: 'good',
                icon: 'savings',
            };
        }
        if (savingsRate < 0) {
            return {
                title: 'Tus gastos superan tus ingresos del mes',
                body: 'Revisá los movimientos más grandes en Movimientos.',
                tone: 'danger',
                icon: 'trending-down',
            };
        }
    }

    return null;
}
