import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../providers/charity_provider.dart';
import '../providers/wallet_provider.dart';
import '../widgets/charity_flow_card.dart';

class CharityScreen extends StatefulWidget {
  const CharityScreen({super.key});

  @override
  State<CharityScreen> createState() => _CharityScreenState();
}

class _CharityScreenState extends State<CharityScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CharityProvider>().loadFlows();
      context.read<CharityProvider>().loadEndpoints();
      context.read<WalletProvider>().loadTransactions();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          TabBar(
            controller: _tabController,
            indicatorColor: AppTheme.accent,
            labelColor: AppTheme.accent,
            unselectedLabelColor: AppTheme.textSecondary,
            tabs: const [
              Tab(text: 'التدفقات', icon: Icon(Icons.volunteer_activism_rounded)),
              Tab(text: 'المحفظة', icon: Icon(Icons.account_balance_wallet_rounded)),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildFlowsTab(),
                _buildWalletTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateFlowDialog(context),
        backgroundColor: AppTheme.accent,
        icon: const Icon(Icons.add_rounded, color: AppTheme.buttonForeground),
        label: const Text('صدقة جارية', style: TextStyle(color: AppTheme.buttonForeground)),
      ),
    );
  }

  Widget _buildFlowsTab() {
    return Consumer<CharityProvider>(
      builder: (context, provider, _) {
        if (provider.isLoading && provider.flows.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.error != null && provider.flows.isEmpty) {
          return _errorState(provider.error!, () => provider.loadFlows());
        }

        if (provider.flows.isEmpty) {
          return _emptyState(
            icon: Icons.favorite_border_rounded,
            message: 'لا توجد تدفقات خيرية',
            subMessage: 'أنشئ صدقة جارية تتبرع تلقائيًا بشكل دوري.',
            actionLabel: 'إنشاء تدفق',
            onAction: () => _showCreateFlowDialog(context),
          );
        }

        return RefreshIndicator(
          color: AppTheme.accent,
          backgroundColor: AppTheme.secondaryBackground,
          onRefresh: () async {
            await provider.loadFlows();
            await context.read<WalletProvider>().loadTransactions();
          },
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: provider.flows.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final flow = provider.flows[index] as Map<String, dynamic>;
              return CharityFlowCard(
                flow: flow,
                onFund: () => _showFundWalletDialog(context, flow['flowID'].toString()),
                onToggle: () => _toggleFlow(context, flow),
                onDelete: () => _confirmDeleteFlow(context, flow['flowID'].toString()),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildWalletTab() {
    return Consumer2<WalletProvider, CharityProvider>(
      builder: (context, wallet, charity, _) {
        if (wallet.isLoading && wallet.transactions.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        final balance = charity.summary?['walletBalance'] ?? 0.0;

        return RefreshIndicator(
          color: AppTheme.accent,
          backgroundColor: AppTheme.secondaryBackground,
          onRefresh: () => wallet.loadTransactions(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                color: AppTheme.cardBackground,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Text('الرصيد الإجمالي', style: Theme.of(context).textTheme.bodySmall),
                      const SizedBox(height: 8),
                      Text(
                        '${(balance as num).toStringAsFixed(2)} AED',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.accent,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text('المعاملات', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              if (wallet.transactions.isEmpty)
                _emptyState(
                  icon: Icons.receipt_long_rounded,
                  message: 'لا توجد معاملات',
                  subMessage: 'ستظهر هنا عمليات التمويل والصرف.',
                  actionLabel: 'تمويل محفظة',
                  onAction: () {
                    if (charity.flows.isNotEmpty) {
                      _showFundWalletDialog(context, charity.flows.first['flowID'].toString());
                    }
                  },
                )
              else
                ...wallet.transactions.cast<Map<String, dynamic>>().map((tx) {
                  return Card(
                    color: AppTheme.cardBackground,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: _txColor(tx).withOpacity(0.15),
                        child: Icon(_txIcon(tx), color: _txColor(tx)),
                      ),
                      title: Text(tx['charityName'] ?? 'محفظة خيرية'),
                      subtitle: Text('${tx['txType']} • ${tx['status']}'),
                      trailing: Text(
                        '${(tx['amount'] as num? ?? 0).toStringAsFixed(2)} AED',
                        style: const TextStyle(
                          color: AppTheme.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }

  Color _txColor(dynamic tx) {
    final type = tx['txType']?.toString().toLowerCase() ?? '';
    return type == 'deposit' ? Colors.greenAccent : Colors.orangeAccent;
  }

  IconData _txIcon(dynamic tx) {
    final type = tx['txType']?.toString().toLowerCase() ?? '';
    return type == 'deposit' ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded;
  }

  void _showCreateFlowDialog(BuildContext context) {
    final provider = context.read<CharityProvider>();
    if (provider.endpoints.isEmpty) {
      provider.loadEndpoints().then((_) => _showCreateFlowDialogContent(context));
    } else {
      _showCreateFlowDialogContent(context);
    }
  }

  void _showCreateFlowDialogContent(BuildContext context) {
    final provider = context.read<CharityProvider>();
    String? selectedCode;
    final amountCtrl = TextEditingController();
    final fundCtrl = TextEditingController();
    String frequency = 'monthly';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('إنشاء تدفق خيري'),
        content: SingleChildScrollView(
          child: StatefulBuilder(
            builder: (context, setState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'الجهة الخيرية'),
                    value: selectedCode,
                    dropdownColor: AppTheme.cardBackground,
                    items: provider.endpoints.cast<Map<String, dynamic>>().map((e) {
                      return DropdownMenuItem(
                        value: e['code'].toString(),
                        child: Text(e['name'].toString()),
                      );
                    }).toList(),
                    onChanged: (v) => setState(() => selectedCode = v),
                  ),
                  const SizedBox(height: 12),
                  _textField(amountCtrl, 'المبلغ الدوري (AED)', isNumber: true),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'التكرار'),
                    value: frequency,
                    dropdownColor: AppTheme.cardBackground,
                    items: const [
                      DropdownMenuItem(value: 'monthly', child: Text('شهري')),
                      DropdownMenuItem(value: 'yearly', child: Text('سنوي')),
                      DropdownMenuItem(value: 'weekly', child: Text('أسبوعي')),
                    ],
                    onChanged: (v) => setState(() => frequency = v ?? 'monthly'),
                  ),
                  const SizedBox(height: 12),
                  _textField(fundCtrl, 'تمويل أولي للمحفظة (اختياري)', isNumber: true),
                ],
              );
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text.trim()) ?? 0;
              final fund = double.tryParse(fundCtrl.text.trim()) ?? 0;
              if (selectedCode == null || amount <= 0) return;
              Navigator.pop(ctx);
              try {
                await provider.createFlow(
                  charityCode: selectedCode!,
                  recurringAmount: amount,
                  frequency: frequency,
                  walletFundAmount: fund,
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم إنشاء التدفق الخيري')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل الإنشاء: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('إنشاء'),
          ),
        ],
      ),
    );
  }

  void _showFundWalletDialog(BuildContext context, String flowID) {
    final amountCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('تمويل المحفظة'),
        content: _textField(amountCtrl, 'المبلغ (AED)', isNumber: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text.trim()) ?? 0;
              if (amount <= 0) return;
              Navigator.pop(ctx);
              try {
                await context.read<WalletProvider>().fundWallet(
                      flowID: flowID,
                      amount: amount,
                    );
                await context.read<CharityProvider>().loadFlows();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم تمويل المحفظة')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل التمويل: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('تمويل'),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleFlow(BuildContext context, Map<String, dynamic> flow) async {
    final current = flow['isActive'] == 1 || flow['isActive'] == true;
    try {
      await context.read<CharityProvider>().updateFlow(
            flowID: flow['flowID'].toString(),
            isActive: !current,
          );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(current ? 'تم إيقاف التدفق' : 'تم تفعيل التدفق')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل التحديث: ${e.toString().replaceFirst('Exception: ', '')}')),
        );
      }
    }
  }

  void _confirmDeleteFlow(BuildContext context, String flowID) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('حذف التدفق'),
        content: const Text('هل أنت متأكد من حذف هذا التدفق الخيري؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<CharityProvider>().deleteFlow(flowID);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم حذف التدفق')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('فشل الحذف: ${e.toString().replaceFirst('Exception: ', '')}')),
                  );
                }
              }
            },
            child: const Text('حذف', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
  }

  Widget _textField(TextEditingController controller, String label, {bool isNumber = false}) {
    return TextField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: AppTheme.inputFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _errorState(String message, VoidCallback onRetry) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 48),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
        ],
      ),
    );
  }

  Widget _emptyState({
    required IconData icon,
    required String message,
    required String subMessage,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: AppTheme.textSecondary, size: 64),
            const SizedBox(height: 16),
            Text(message, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(subMessage, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.add_rounded),
              label: Text(actionLabel),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: AppTheme.buttonForeground,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
