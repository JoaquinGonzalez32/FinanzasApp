import { View, Text, TouchableOpacity } from 'react-native';
import TransactionRow from '../../../../components/ui/TransactionRow';
import { SkeletonLoader, FadeIn, EmptyState } from '../../../../components/ui';
import { monthLabel } from '../../../../src/lib/helpers';

function getBudgetMonthLabel(tx) {
    if (tx.type !== 'income' || !tx.budget_month) return undefined;
    if (tx.budget_month === tx.date.substring(0, 7)) return undefined;
    return `→ ${monthLabel(tx.budget_month)}`;
}

const RecentTransactions = ({
    recentGroups,
    loading,
    refreshing,
    hasTransactions,
    hasMoreThanShown,
    error,
    txAccount,
    isAllAccounts,
    onEditTx,
    onDeleteTx,
    onViewAll,
    onAddFirst,
}) => {
    return (
        <View className="px-5 pt-2 flex-1">
            <FadeIn delay={250}>
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Recientes
                    </Text>
                    {hasMoreThanShown && (
                        <TouchableOpacity onPress={onViewAll}>
                            <Text className="text-xs font-bold text-primary">Ver todo</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </FadeIn>

            {loading && !refreshing && <SkeletonLoader.List count={3} />}

            {!loading && !hasTransactions && !error && (
                <FadeIn delay={350}>
                    <EmptyState
                        icon="receipt-long"
                        title="Sin movimientos este mes"
                        subtitle="Toca + para registrar tu primer gasto"
                        actionLabel="Registrar"
                        onAction={onAddFirst}
                        compact
                    />
                </FadeIn>
            )}

            {!loading && recentGroups.map(([label, txs], gi) => (
                <FadeIn key={label} delay={300 + gi * 50}>
                    <View className="mb-2">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 mt-2">
                            {label}
                        </Text>
                        <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            {txs.map((tx, ti) => (
                                <View key={tx.id}>
                                    {ti > 0 && <View className="h-px bg-slate-100 dark:bg-slate-800 ml-14" />}
                                    <TransactionRow
                                        transaction={tx}
                                        currency={txAccount(tx)?.currency}
                                        onPress={() => onEditTx(tx)}
                                        onLongPress={() => onDeleteTx(tx)}
                                        accountName={isAllAccounts ? txAccount(tx)?.name : undefined}
                                        accountColor={isAllAccounts ? txAccount(tx)?.color : undefined}
                                        budgetMonthLabel={getBudgetMonthLabel(tx)}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                </FadeIn>
            ))}

            {/* Ver todos button at the bottom of the list */}
            {!loading && hasTransactions && hasMoreThanShown && (
                <FadeIn delay={500}>
                    <TouchableOpacity
                        onPress={onViewAll}
                        className="flex-row items-center justify-center gap-1.5 py-3 mt-1"
                    >
                        <Text className="text-sm font-bold text-primary">Ver todos los movimientos</Text>
                        <View className="h-5 w-5 rounded-full bg-primary/10 items-center justify-center">
                            <Text className="text-xs font-bold text-primary">→</Text>
                        </View>
                    </TouchableOpacity>
                </FadeIn>
            )}
        </View>
    );
};

export default RecentTransactions;
