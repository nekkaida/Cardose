# Maestro E2E Testing

End-to-end tests for Premium Gift Box mobile app using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. Install Maestro CLI:
```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (via WSL or use Chocolatey)
choco install maestro
```

2. Have a running Android emulator or iOS simulator

3. Build the app:
```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

## Running Tests

### Run all E2E tests
```bash
npm run e2e
```

### Run a specific flow
```bash
maestro test .maestro/flows/01_auth_login.yaml
```

### Record a new flow
```bash
npm run e2e:record
```

### Open Maestro Studio (visual editor)
```bash
npm run e2e:studio
```

## Test Flows

| Flow | Description |
|------|-------------|
| 01_auth_login.yaml | Login with valid credentials |
| 02_auth_login_invalid.yaml | Login with invalid credentials |
| 03_orders_create.yaml | Create a new order |
| 04_customers_list.yaml | View customer list |
| 05_inventory_view.yaml | View inventory materials |
| 06_production_board.yaml | View production board |
| 07_financial_view.yaml | View financial dashboard |
| 08_dashboard_view.yaml | View main dashboard |
| 09_logout.yaml | Logout functionality |

## Writing New Tests

Maestro uses YAML files to define test flows. Key commands:

```yaml
# Launch the app
- launchApp

# Tap on element
- tapOn:
    text: "Button Text"

# Input text
- inputText: "Hello World"

# Assert element is visible
- assertVisible:
    text: "Expected Text"

# Scroll
- scroll:
    direction: DOWN

# Wait for animations
- waitForAnimationToEnd
```

See [Maestro Documentation](https://maestro.mobile.dev/reference/commands) for full command reference.

## CI Integration

Maestro tests can be run in CI using [Maestro Cloud](https://cloud.mobile.dev/) or with local emulators in GitHub Actions.

Example GitHub Actions step:
```yaml
- name: Run E2E Tests
  run: |
    curl -Ls "https://get.maestro.mobile.dev" | bash
    export PATH="$PATH:$HOME/.maestro/bin"
    maestro test .maestro/flows/
```
