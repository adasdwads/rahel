import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../services/social_media_service.dart';

class SocialLegacyScreen extends StatefulWidget {
  const SocialLegacyScreen({super.key});

  @override
  State<SocialLegacyScreen> createState() => _SocialLegacyScreenState();
}

class _SocialLegacyScreenState extends State<SocialLegacyScreen> {
  final SocialMediaService _socialMediaService = SocialMediaService();
  final TextEditingController _obituaryController = TextEditingController();
  final TextEditingController _destructDescriptionController = TextEditingController();

  bool _isLoading = false;
  bool _isPosting = false;
  String? _error;
  List<Map<String, dynamic>> _platforms = [];
  List<Map<String, dynamic>> _legacyConfigs = [];
  List<Map<String, dynamic>> _destructItems = [];
  final Set<String> _selectedPlatforms = <String>{};

  static const List<Map<String, String>> _platformCatalog = [
    {'key': 'x', 'name': 'X (Twitter)', 'asset': 'assets/social/x.png'},
    {'key': 'instagram', 'name': 'Instagram', 'asset': 'assets/social/instagram.png'},
    {'key': 'facebook', 'name': 'Facebook', 'asset': 'assets/social/facebook.png'},
    {'key': 'snapchat', 'name': 'Snapchat', 'asset': 'assets/social/snapchat.png'},
    {'key': 'tiktok', 'name': 'TikTok', 'asset': 'assets/social/tiktok.png'},
    {'key': 'linkedin', 'name': 'LinkedIn', 'asset': 'assets/social/linkedin.png'},
    {'key': 'telegram', 'name': 'Telegram', 'asset': 'assets/social/telegram.png'},
  ];

  @override
  void initState() {
    super.initState();
    _loadPlatforms();
  }

  @override
  void dispose() {
    _obituaryController.dispose();
    _destructDescriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadPlatforms() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final connectedPlatforms = await _socialMediaService.getConnectedPlatforms();
      final legacyConfigs = await _socialMediaService.getLegacyConfigs();
      final merged = _platformCatalog.map((platform) {
        final match = connectedPlatforms.cast<Map<String, dynamic>>().firstWhere(
          (item) => item['platformName'] == platform['key'],
          orElse: () => <String, dynamic>{},
        );

        return {
          'platformName': platform['key'],
          'displayName': platform['name'],
          'asset': platform['asset'],
          'connected': match['connected'] == true,
          'username': match['username'],
        };
      }).toList();

      _selectedPlatforms
        ..clear()
        ..addAll(
          merged
              .where((platform) => platform['connected'] == true)
              .map((platform) => platform['platformName'].toString()),
        );

      if (mounted) {
        setState(() {
          _platforms = merged;
          _legacyConfigs = legacyConfigs['socialConfigs'] ?? <Map<String, dynamic>>[];
          _destructItems = legacyConfigs['selfDestructItems'] ?? <Map<String, dynamic>>[];
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _connectPlatform(String platformName) async {
    if (mounted) {
      setState(() => _isLoading = true);
    }
    try {
      await _socialMediaService.connectPlatform(platformName);
      await _loadPlatforms();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم فتح صفحة الربط وتحديث الحساب بنجاح')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _disconnectPlatform(String platformName) async {
    if (mounted) {
      setState(() => _isLoading = true);
    }
    try {
      await _socialMediaService.disconnectPlatform(platformName);
      _selectedPlatforms.remove(platformName);
      await _loadPlatforms();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم فصل الحساب بنجاح')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _postObituary() async {
    final text = _obituaryController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى كتابة نص النعي أولاً')),
      );
      return;
    }

    if (_selectedPlatforms.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختر منصة واحدة على الأقل للنشر')),
      );
      return;
    }

    setState(() => _isPosting = true);
    try {
      for (final platformName in _selectedPlatforms) {
        await _socialMediaService.postObituary(platformName, text);
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تم نشر النعي على ${_selectedPlatforms.length} منصة')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) {
        setState(() => _isPosting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الحسابات الاجتماعية'),
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.cardBackground,
        onRefresh: _loadPlatforms,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildHeaderCard(),
            const SizedBox(height: 16),
            if (_error != null) _buildErrorCard(),
            ..._platforms.map(_buildPlatformCard),
            const SizedBox(height: 20),
            _buildObituaryComposer(),
            const SizedBox(height: 20),
            _buildSelfDestructSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    final connectedCount =
        _platforms.where((platform) => platform['connected'] == true).length;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppTheme.goldGradient,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ربط الحسابات الاجتماعية',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppTheme.buttonForeground,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'اربط 7 منصات اجتماعية، اختر الحسابات المتصلة، ثم انشر رسالة النعي مباشرة.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.buttonForeground,
                ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.18),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '$connectedCount / 7 حسابات متصلة',
              style: const TextStyle(
                color: AppTheme.buttonForeground,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4F4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFD0D0)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, color: Colors.redAccent),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _error!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.redAccent,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlatformCard(Map<String, dynamic> platform) {
    final connected = platform['connected'] == true;
    final platformName = platform['platformName'].toString();
    final username = platform['username']?.toString();
    final selected = _selectedPlatforms.contains(platformName);
    final config = _legacyConfigs.firstWhere(
      (item) => item['platform']?.toString().toLowerCase() == platformName,
      orElse: () => <String, dynamic>{},
    );
    final hasConfig = config.isNotEmpty;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                _buildPlatformIcon(platform['asset'].toString()),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        platform['displayName'].toString(),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        connected
                            ? 'مرتبط باسم المستخدم ${username ?? ''}'
                            : 'الحساب غير مرتبط حالياً',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                _buildStatusChip(connected),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: connected
                      ? Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: _isLoading
                                    ? null
                                    : () => _showPlatformConfigDialog(platformName, config),
                                icon: const Icon(Icons.settings_rounded),
                                label: Text(hasConfig ? 'تعديل' : 'تكوين'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _isLoading
                                    ? null
                                    : () => _disconnectPlatform(platformName),
                                icon: const Icon(Icons.link_off_rounded),
                                label: const Text('فصل'),
                              ),
                            ),
                          ],
                        )
                      : ElevatedButton.icon(
                          onPressed:
                              _isLoading ? null : () => _connectPlatform(platformName),
                          icon: const Icon(Icons.link_rounded),
                          label: const Text('ربط'),
                        ),
                ),
                const SizedBox(width: 12),
                Checkbox(
                  value: connected && selected,
                  activeColor: AppTheme.accent,
                  onChanged: connected
                      ? (value) {
                          setState(() {
                            if (value == true) {
                              _selectedPlatforms.add(platformName);
                            } else {
                              _selectedPlatforms.remove(platformName);
                            }
                          });
                        }
                      : null,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlatformIcon(String assetPath) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: AppTheme.secondaryBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Image.asset(assetPath, fit: BoxFit.contain),
      ),
    );
  }

  Widget _buildStatusChip(bool connected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: connected
            ? const Color(0x1A2E7D32)
            : const Color(0x1AF57C00),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.circle,
            size: 10,
            color: connected ? const Color(0xFF2E7D32) : const Color(0xFFF57C00),
          ),
          const SizedBox(width: 8),
          Text(
            connected ? 'Connected' : 'Disconnected',
            style: TextStyle(
              color: connected ? const Color(0xFF2E7D32) : const Color(0xFFF57C00),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildObituaryComposer() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'محرر نص النعي',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'اكتب الرسالة وحدد المنصات المتصلة التي تريد النشر عليها.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _obituaryController,
              minLines: 6,
              maxLines: 10,
              decoration: InputDecoration(
                hintText: 'اكتب نص النعي هنا...',
                filled: true,
                fillColor: AppTheme.inputFill,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _platforms
                  .where((platform) => platform['connected'] == true)
                  .map(
                    (platform) => FilterChip(
                      selected: _selectedPlatforms
                          .contains(platform['platformName'].toString()),
                      label: Text(platform['displayName'].toString()),
                      selectedColor: AppTheme.secondaryAccent.withOpacity(0.18),
                      checkmarkColor: AppTheme.accent,
                      onSelected: (selected) {
                        setState(() {
                          final key = platform['platformName'].toString();
                          if (selected) {
                            _selectedPlatforms.add(key);
                          } else {
                            _selectedPlatforms.remove(key);
                          }
                        });
                      },
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isPosting || _isLoading ? null : _postObituary,
                icon: _isPosting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.buttonForeground,
                        ),
                      )
                    : const Icon(Icons.campaign_rounded),
                label: Text(_isPosting ? 'جاري النشر...' : 'نشر النعي'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.secondaryAccent,
                  foregroundColor: AppTheme.buttonForeground,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelfDestructSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'التدمير الذاتي',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                TextButton.icon(
                  onPressed: _isLoading ? null : _showAddDestructDialog,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('إضافة'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_destructItems.isEmpty)
              Text(
                'لا توجد عناصر تدمير ذاتي بعد.',
                style: Theme.of(context).textTheme.bodySmall,
              )
            else
              ..._destructItems.map((item) {
                final confirmed = item['confirmed'] == 1 || item['confirmed'] == true;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Checkbox(
                    value: confirmed,
                    onChanged: confirmed
                        ? null
                        : (_) => _confirmDestructItem(item['itemID'].toString()),
                  ),
                  title: Text(item['description']?.toString() ?? 'عنصر'),
                  subtitle: Text(item['targetType']?.toString() ?? ''),
                  trailing: IconButton(
                    onPressed: () => _deleteDestructItem(item['itemID'].toString()),
                    icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  void _showPlatformConfigDialog(String platformName, Map<String, dynamic> config) {
    final obituaryController =
        TextEditingController(text: config['obituaryText']?.toString() ?? _obituaryController.text);
    final donationController =
        TextEditingController(text: config['donationLink']?.toString() ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.cardBackground,
        title: Text('تكوين ${platformName.toUpperCase()}'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: obituaryController,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'نص النعي'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: donationController,
                decoration: const InputDecoration(labelText: 'رابط التبرع'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _socialMediaService.saveLegacyPlatformConfig(
                platform: platformName,
                obituaryText: obituaryController.text.trim(),
                donationLink: donationController.text.trim().isEmpty
                    ? null
                    : donationController.text.trim(),
              );
              await _loadPlatforms();
            },
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
  }

  void _showAddDestructDialog() {
    String targetType = 'social_post';
    _destructDescriptionController.clear();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          backgroundColor: AppTheme.cardBackground,
          title: const Text('إضافة عنصر تدمير ذاتي'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: targetType,
                  items: const [
                    DropdownMenuItem(value: 'social_post', child: Text('منشور اجتماعي')),
                    DropdownMenuItem(value: 'account', child: Text('حساب')),
                    DropdownMenuItem(value: 'file', child: Text('ملف')),
                    DropdownMenuItem(value: 'message', child: Text('رسالة')),
                  ],
                  onChanged: (value) => setState(() => targetType = value ?? 'social_post'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _destructDescriptionController,
                  decoration: const InputDecoration(labelText: 'الوصف'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
            TextButton(
              onPressed: () async {
                Navigator.pop(ctx);
                await _socialMediaService.addSelfDestructItem(
                  targetType: targetType,
                  description: _destructDescriptionController.text.trim(),
                  priority: 1,
                );
                await _loadPlatforms();
              },
              child: const Text('إضافة'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDestructItem(String itemId) async {
    await _socialMediaService.confirmSelfDestructItem(itemId);
    await _loadPlatforms();
  }

  Future<void> _deleteDestructItem(String itemId) async {
    await _socialMediaService.deleteSelfDestructItem(itemId);
    await _loadPlatforms();
  }
}