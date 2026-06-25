import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../config/app_theme.dart';
import '../providers/capsule_provider.dart';
import '../widgets/capsule_card.dart';

class TimeCapsuleScreen extends StatefulWidget {
  const TimeCapsuleScreen({super.key});

  @override
  State<TimeCapsuleScreen> createState() => _TimeCapsuleScreenState();
}

class _TimeCapsuleScreenState extends State<TimeCapsuleScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CapsuleProvider>().loadCapsules();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<CapsuleProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading && provider.capsules.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null && provider.capsules.isEmpty) {
            return _errorState(provider.error!, () => provider.loadCapsules());
          }

          if (provider.capsules.isEmpty) {
            return _emptyState(
              message: 'لا توجد كبسولات زمنية',
              subMessage: 'ارسل رسالة نصية أو صوتية أو مرئية للمستقبل.',
              actionLabel: 'كبسولة جديدة',
              onAction: () => _showCreateCapsuleDialog(context),
            );
          }

          return RefreshIndicator(
            color: AppTheme.accent,
            backgroundColor: AppTheme.secondaryBackground,
            onRefresh: () => provider.loadCapsules(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: provider.capsules.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final capsule = provider.capsules[index] as Map<String, dynamic>;
                return CapsuleCard(
                  capsule: capsule,
                  onEdit: () => _showEditCapsuleDialog(context, capsule),
                  onDelete: () => _confirmDelete(context, capsule['capsuleID'].toString()),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateCapsuleDialog(context),
        backgroundColor: AppTheme.accent,
        icon: const Icon(Icons.add_rounded, color: AppTheme.buttonForeground),
        label: const Text('كبسولة جديدة', style: TextStyle(color: AppTheme.buttonForeground)),
      ),
    );
  }

  void _showCreateCapsuleDialog(BuildContext context) {
    _showCapsuleFormDialog(context, isEdit: false);
  }

  void _showEditCapsuleDialog(BuildContext context, Map<String, dynamic> capsule) {
    _showCapsuleFormDialog(context, isEdit: true, capsule: capsule);
  }

  void _showCapsuleFormDialog(
    BuildContext context, {
    required bool isEdit,
    Map<String, dynamic>? capsule,
  }) {
    final titleCtrl = TextEditingController(text: capsule?['title']?.toString() ?? '');
    final contentCtrl = TextEditingController(text: capsule?['textContent']?.toString() ?? '');
    final recipientCtrl = TextEditingController(text: capsule?['recipientContact']?.toString() ?? '');
    final nameCtrl = TextEditingController(text: capsule?['recipientName']?.toString() ?? '');
    final occasionCtrl = TextEditingController(text: capsule?['occasion']?.toString() ?? '');

    DateTime? selectedDate;
    TimeOfDay? selectedTime;

    final parsed = _parseDate(capsule?['targetReleaseDate']);
    if (parsed != null) {
      selectedDate = parsed;
      selectedTime = TimeOfDay.fromDateTime(parsed);
    } else {
      selectedDate = DateTime.now().add(const Duration(days: 30));
      selectedTime = TimeOfDay.now();
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            backgroundColor: AppTheme.cardBackground,
            title: Text(isEdit ? 'تعديل الكبسولة' : 'كبسولة زمنية جديدة'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _textField(titleCtrl, 'عنوان الرسالة'),
                  const SizedBox(height: 10),
                  _textField(contentCtrl, 'محتوى الرسالة', maxLines: 4),
                  const SizedBox(height: 10),
                  _textField(recipientCtrl, 'بريد/هاتف المستلم'),
                  const SizedBox(height: 10),
                  _textField(nameCtrl, 'اسم المستلم'),
                  const SizedBox(height: 10),
                  _textField(occasionCtrl, 'المناسبة (اختياري)'),
                  const SizedBox(height: 14),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.calendar_today_rounded, color: AppTheme.accent),
                    title: Text(
                      selectedDate != null
                          ? DateFormat.yMMMd('ar').format(selectedDate!)
                          : 'اختر التاريخ',
                    ),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedDate ?? DateTime.now().add(const Duration(days: 1)),
                        firstDate: DateTime.now().add(const Duration(days: 1)),
                        lastDate: DateTime.now().add(const Duration(days: 365 * 50)),
                        builder: (context, child) => Theme(
                          data: Theme.of(context).copyWith(
                            colorScheme: const ColorScheme.light(primary: AppTheme.accent),
                          ),
                          child: child!,
                        ),
                      );
                      if (picked != null) {
                        setState(() => selectedDate = picked);
                      }
                    },
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.access_time_rounded, color: AppTheme.accent),
                    title: Text(selectedTime?.format(context) ?? 'اختر الوقت'),
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: selectedTime ?? TimeOfDay.now(),
                        builder: (context, child) => Theme(
                          data: Theme.of(context).copyWith(
                            colorScheme: const ColorScheme.light(primary: AppTheme.accent),
                          ),
                          child: child!,
                        ),
                      );
                      if (picked != null) {
                        setState(() => selectedTime = picked);
                      }
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
              TextButton(
                onPressed: () async {
                  if (selectedDate == null || selectedTime == null) return;
                  final releaseDate = DateTime(
                    selectedDate!.year,
                    selectedDate!.month,
                    selectedDate!.day,
                    selectedTime!.hour,
                    selectedTime!.minute,
                  );

                  final provider = context.read<CapsuleProvider>();
                  Navigator.pop(ctx);
                  try {
                    if (isEdit && capsule != null) {
                      await provider.updateCapsule(
                        capsuleID: capsule['capsuleID'].toString(),
                        title: titleCtrl.text.trim(),
                        textContent: contentCtrl.text.trim(),
                        targetReleaseDate: releaseDate,
                        recipientContact: recipientCtrl.text.trim(),
                        recipientName: nameCtrl.text.trim(),
                        occasion: occasionCtrl.text.trim(),
                      );
                    } else {
                      await provider.createCapsule(
                        title: titleCtrl.text.trim(),
                        textContent: contentCtrl.text.trim(),
                        targetReleaseDate: releaseDate,
                        recipientContact: recipientCtrl.text.trim(),
                        recipientName: nameCtrl.text.trim(),
                        occasion: occasionCtrl.text.trim(),
                      );
                    }
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(isEdit ? 'تم تحديث الكبسولة' : 'تم إنشاء الكبسولة')),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text('فشل: ${e.toString().replaceFirst('Exception: ', '')}')),
                      );
                    }
                  }
                },
                child: Text(isEdit ? 'حفظ' : 'إنشاء'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, String capsuleID) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: const Text('حذف الكبسولة'),
        content: const Text('هل أنت متأكد من حذف هذه الكبسولة؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<CapsuleProvider>().deleteCapsule(capsuleID);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم حذف الكبسولة')),
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

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    try {
      return DateTime.parse(value.toString());
    } catch (_) {
      return null;
    }
  }

  Widget _textField(TextEditingController controller, String label, {int maxLines = 1}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
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
            const Icon(Icons.hourglass_empty_rounded, color: AppTheme.textSecondary, size: 64),
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
