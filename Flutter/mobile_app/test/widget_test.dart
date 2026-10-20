import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/main.dart';

void main() {
  testWidgets('SMSGatewayApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SMSGatewayApp(initialLoggedIn: false));
    expect(find.text('SMS Gateway Mobile'), findsOneWidget);
  });
}
