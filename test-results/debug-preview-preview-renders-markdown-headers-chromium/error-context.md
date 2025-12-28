# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - img [ref=e8]
    - heading "Welcome Back" [level=1] [ref=e11]
    - paragraph [ref=e12]: Sign in to continue to AutoBlog
  - generic [ref=e13]:
    - generic [ref=e14]:
      - generic [ref=e15]: Email Address
      - generic [ref=e16]:
        - img [ref=e17]
        - textbox "Email Address" [ref=e20]:
          - /placeholder: you@example.com
    - generic [ref=e21]:
      - generic [ref=e22]: Password
      - generic [ref=e23]:
        - img [ref=e24]
        - textbox "Password" [ref=e27]:
          - /placeholder: ••••••••
    - button "Sign In" [ref=e28] [cursor=pointer]
  - generic [ref=e33]: Or continue with
  - button "Sign in with Google" [ref=e34] [cursor=pointer]:
    - img [ref=e35]
    - text: Sign in with Google
  - paragraph [ref=e40]:
    - text: Don't have an account?
    - link "Sign up" [ref=e41] [cursor=pointer]:
      - /url: /signup
```