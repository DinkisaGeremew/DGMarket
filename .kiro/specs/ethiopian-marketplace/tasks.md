# Implementation Plan

- [x] 1. Set up project structure and core interfaces


  - Initialize monorepo with `frontend/`, `backend/`, `shared/`, `database/` directories
  - Set up TypeScript in backend and shared packages
  - Define shared TypeScript interfaces: User, Product, Order, OrderItem, Cart, CartItem, OTPRecord
  - Set up Express app skeleton with middleware (cors, json, error handler)
  - Set up React app with Tailwind CSS
  - Configure fast-check as the property-based testing library
  - _Requirements: 1.1, 2.2, 4.1, 9.1_





- [ ] 2. Implement data serialization and validation layer
  - [x] 2.1 Implement JSON serialization and deserialization for all data models



    - Write `serialize` and `deserialize` functions for User, Product, Order, Cart

    - Implement field-level validation on deserialization




    - Return structured validation errors for missing required fields
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 2.2 Write property test for serialization round-trip (Property 20)

    - **Property 20: Serialization round-trip**
    - **Validates: Requirements 9.1, 9.2**

  - [ ] 2.3 Write property test for invalid JSON deserialization (Property 21)
    - **Property 21: Invalid JSON deserialization returns structured error**

    - **Validates: Requirements 9.3**


- [x] 3. Implement authentication module

  - [ ] 3.1 Implement email/password registration and login
    - Write user creation with hashed password (bcrypt)

    - Implement JWT issuance on successful login

    - Reject duplicate email or phone registrations

    - _Requirements: 1.2, 1.5_






  - [ ] 3.2 Write property test for email registration produces valid token (Property 2)
    - **Property 2: Email registration produces valid token**

    - **Validates: Requirements 1.2**
  - [x] 3.3 Write property test for duplicate registration rejection (Property 5)

    - **Property 5: Duplicate registration is rejected**
    - **Validates: Requirements 1.5**

  - [ ] 3.4 Implement OTP send and verify for phone authentication
    - Write OTP generation, storage, and expiry logic (5-minute window)

    - Implement OTP verification that issues a JWT on success
    - Reject expired or mismatched OTPs
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 3.5 Write property test for OTP issuance (Property 1)

    - **Property 1: OTP issuance on valid phone**
    - **Validates: Requirements 1.1**

  - [x] 3.6 Write property test for OTP round-trip authentication (Property 3)

    - **Property 3: OTP round-trip authentication**

    - **Validates: Requirements 1.3**




  - [x] 3.7 Write property test for invalid OTP rejection (Property 4)

    - **Property 4: Invalid OTP is rejected**
    - **Validates: Requirements 1.4**


- [ ] 4. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement product listing module

  - [ ] 5.1 Implement product CRUD endpoints
    - Write create, read, update, and deactivate handlers

    - Validate required fields on creation (title, description, price, category, image)
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ] 5.2 Write property test for product listing round-trip (Property 6)
    - **Property 6: Product listing round-trip**

    - **Validates: Requirements 2.2, 2.3**
  - [ ] 5.3 Write property test for deactivated listing excluded from search (Property 7)
    - **Property 7: Deactivated listing excluded from search**

    - **Validates: Requirements 2.4, 8.1**

  - [x] 5.4 Write property test for invalid product listing rejection (Property 8)






    - **Property 8: Invalid product listing is rejected**
    - **Validates: Requirements 2.5**

  - [ ] 5.5 Implement product search and filtering
    - Write search logic matching title, description, and category
    - Implement filter support for category, price range, and location

    - Implement pagination with max 24 items per page
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 5.6 Write property test for search and filter results (Property 9)

    - **Property 9: Search and filter results satisfy all criteria**




    - **Validates: Requirements 3.1, 3.2**
  - [x] 5.7 Write property test for product detail required fields (Property 10)


    - **Property 10: Product detail contains all required fields**

    - **Validates: Requirements 3.3**



  - [x] 5.8 Write property test for pagination limit (Property 11)





    - **Property 11: Pagination limit enforced**

    - **Validates: Requirements 3.5**

- [x] 6. Implement cart and order module







  - [ ] 6.1 Implement cart add, remove, and clear operations
    - Write in-memory or DB-backed cart with add/remove/clear

    - _Requirements: 4.1, 4.2_


  - [ ] 6.2 Write property test for cart add and remove consistency (Property 12)
    - **Property 12: Cart add and remove consistency**
    - **Validates: Requirements 4.1, 4.2**

  - [ ] 6.3 Implement order creation and total calculation
    - Write order creation from cart with total = sum(unit price × quantity)
    - Clear cart on order confirmation

    - Reject checkout on empty cart
    - _Requirements: 4.3, 4.4, 4.5_
  - [x] 6.4 Write property test for order total arithmetic invariant (Property 13)

    - **Property 13: Order total arithmetic invariant**
    - **Validates: Requirements 4.3**
  - [ ] 6.5 Write property test for order confirmation clears cart (Property 14)
    - **Property 14: Order confirmation clears cart**
    - **Validates: Requirements 4.4**
  - [ ] 6.6 Write property test for empty cart checkout rejection (Property 15)
    - **Property 15: Empty cart checkout is rejected**
    - **Validates: Requirements 4.5**
  - [ ] 6.7 Implement order status management
    - Write status transition logic: pending_payment → paid → shipped → delivered
    - Record timestamps on each status change
    - Notify buyer and seller on status updates
    - _Requirements: 7.2, 7.3_
  - [ ] 6.8 Write property test for order status transition correctness (Property 19)
    - **Property 19: Order status transition correctness**
    - **Validates: Requirements 7.2, 7.3**

- [ ] 7. Checkpoint - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement payment integration module
  - [ ] 8.1 Implement Telebirr payment initiation and confirmation handler
    - Write payment request builder for Telebirr API
    - Handle success and failure callbacks, update order status accordingly
    - _Requirements: 5.1, 5.4, 5.5_
  - [ ] 8.2 Implement CBE Birr payment initiation and confirmation handler
    - Write payment request builder for CBE Birr API
    - Handle success and failure callbacks, update order status accordingly
    - _Requirements: 5.2, 5.4, 5.5_
  - [ ] 8.3 Implement bank transfer payment flow
    - Return bank account details on selection
    - Mark order as pending until admin confirms payment
    - _Requirements: 5.3_
  - [ ] 8.4 Write property test for payment status transitions (Property 16)
    - **Property 16: Payment status transitions are valid**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**

- [ ] 9. Implement i18n module
  - [ ] 9.1 Create Oromo and English translation key files
    - Write JSON translation files for all static UI text
    - Implement `t(key, language)` lookup function
    - _Requirements: 6.1, 6.2, 6.4_
  - [ ] 9.2 Write property test for language toggle translations (Property 17)
    - **Property 17: Language toggle returns translations for all keys**
    - **Validates: Requirements 6.1, 6.2, 6.4**
  - [ ] 9.3 Implement language preference persistence in session
    - Store selected language in session/localStorage
    - _Requirements: 6.3_
  - [ ] 9.4 Write property test for language preference persistence (Property 18)
    - **Property 18: Language preference persistence**
    - **Validates: Requirements 6.3**

- [ ] 10. Implement admin module
  - [ ] 10.1 Implement admin dashboard metrics endpoint
    - Return total users, active listings, and orders placed counts
    - _Requirements: 8.3_
  - [ ] 10.2 Implement admin user and listing management endpoints
    - Write deactivate seller endpoint (hides all seller listings)
    - Write remove listing endpoint with seller notification
    - Write delete user endpoint with active-order confirmation guard
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 11. Build frontend UI
  - [ ] 11.1 Implement AuthPage with phone OTP and email/password flows
    - Wire to backend auth endpoints
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ] 11.2 Implement LanguageToggle component
    - Connect to i18n module, persist preference in session
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ] 11.3 Implement ProductListingPage with search, filters, and pagination
    - Wire to product search endpoint
    - _Requirements: 3.1, 3.2, 3.5_
  - [ ] 11.4 Implement ProductDetailPage
    - Display all required product fields
    - Add-to-cart button wired to cart module
    - _Requirements: 3.3, 4.1_
  - [ ] 11.5 Implement CartPage and CheckoutPage
    - Show itemized totals in ETB, payment method selection
    - Wire to order creation and payment endpoints
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_
  - [ ] 11.6 Implement SellerDashboard
    - Product listing management (create, update, deactivate)
    - Order management with status updates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3_
  - [ ] 11.7 Implement AdminDashboard
    - Metrics display, user management, listing moderation
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 12. Final Checkpoint - Ensure all tests pass, ask the user if questions arise.
