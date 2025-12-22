import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { authApi, userApi } from "../api";

const USERNAME_REGEX = /^[A-Za-z.,]{3,20}$/;

const formatUsernameInput = (value: string): string => {
  if (!value) return "";

  return value
    .replace(/[^A-Za-z.,]/g, "")
    .split(/([.,])/g)
    .map((segment) => {
      if (segment === "." || segment === "," || segment === "") {
        return segment;
      }
      const lower = segment.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
};

const Settings: React.FC = () => {
  const { user, checkAuth } = useAuth();

  // Account settings
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] =
    useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  // Account settings errors
  const [usernameError, setUsernameError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [accountSuccess, setAccountSuccess] = useState<string>("");

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteCode, setDeleteCode] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string>("");
  const [deleteStatus, setDeleteStatus] = useState<string>("");
  const [isSendingDeleteCode, setIsSendingDeleteCode] =
    useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  // Load user's username and email from auth context
  useEffect(() => {
    if (user) {
      setUsername(formatUsernameInput(user.username || ""));
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = () => {
    // Placeholder save action
    // In a real app, call an API to persist preferences

    // Settings saved notification - using alert for now, can be replaced with modal if needed
    alert("Settings saved.");
  };

  // Account settings handlers
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (value: string): boolean => {
    // Username: 3-20 characters, letters with optional comma/period separators
    return USERNAME_REGEX.test(value);
  };

  const validatePassword = (password: string): string | null => {
    // Common passwords to check against
    const commonPasswords = [
      "12345678",
      "password",
      "123456789",
      "1234567890",
      "qwerty123",
      "abc12345",
      "password123",
      "admin1234",
      "letmein12",
      "welcome1",
    ];

    // Check length (8-12 characters)
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (password.length > 12) {
      return "Password must be no more than 12 characters long.";
    }

    // Count uppercase letters
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    if (uppercaseCount < 2) {
      return "Password must include at least 2 uppercase letters.";
    }

    // Count numbers
    const numberCount = (password.match(/[0-9]/g) || []).length;
    if (numberCount < 2) {
      return "Password must include at least 2 numbers.";
    }

    // Count special characters
    const specialCharCount = (password.match(/[!@#$%^&*(),.?":{}|<>]/g) || [])
      .length;
    if (specialCharCount < 2) {
      return "Password must include at least 2 special characters.";
    }

    // Check for common passwords
    if (commonPasswords.includes(password.toLowerCase())) {
      return "Your password is too common or easily guessable.";
    }

    return null; // Password is valid
  };

  const handleUpdateAccount = async () => {
    setUsernameError("");
    setEmailError("");
    setPasswordError("");
    setAccountSuccess("");

    let hasError = false;

    if (!username.trim()) {
      setUsernameError("Username is required");
      hasError = true;
    } else if (!validateUsername(username)) {
      setUsernameError("3-20 characters");
      hasError = true;
    }

    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }

    // Validate password if any password field is filled
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword) {
        setPasswordError("Current password is required to change password");
        hasError = true;
      } else if (!newPassword) {
        setPasswordError("New password is required");
        hasError = true;
      } else {
        // Check if current password matches new password
        if (currentPassword === newPassword) {
          setPasswordError(
            "New password must be different from current password"
          );
          hasError = true;
        }
        // Check if current password matches confirm password
        else if (confirmPassword && currentPassword === confirmPassword) {
          setPasswordError(
            "Confirm password must be different from current password"
          );
          hasError = true;
        }
        // Validate password format
        else {
          const passwordValidationError = validatePassword(newPassword);
          if (passwordValidationError) {
            setPasswordError(passwordValidationError);
            hasError = true;
          } else if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match");
            hasError = true;
          }
        }
      }
    }

    if (hasError) return;

    const profileUpdates: { username?: string; email?: string } = {};
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (trimmedUsername && trimmedUsername !== (user?.username || "")) {
      profileUpdates.username = trimmedUsername;
    }
    if (trimmedEmail && trimmedEmail !== (user?.email || "")) {
      profileUpdates.email = trimmedEmail;
    }

    let profileUpdated = false;
    let passwordUpdated = false;

    if (Object.keys(profileUpdates).length > 0) {
      try {
        const updatedUser = await userApi.updateProfile(profileUpdates);
        await checkAuth();
        setUsername(updatedUser.username);
        setEmail(updatedUser.email);
        setAccountSuccess("Account information updated successfully!");
        profileUpdated = true;
      } catch (error) {
        const apiError = error as { status?: number; message?: string };
        const message = apiError.message || "Failed to update account details.";
        if (message.toLowerCase().includes("username")) {
          setUsernameError(message);
        } else if (message.toLowerCase().includes("email")) {
          setEmailError(message);
        } else {
          setAccountSuccess(message);
        }
        return;
      }
    }

    if (currentPassword || newPassword || confirmPassword) {
      try {
        await authApi.updatePassword(currentPassword, newPassword);
        setAccountSuccess(
          "Password updated successfully! Your old password will no longer work."
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        passwordUpdated = true;
      } catch (error) {
        const apiError = error as { status?: number; message?: string };
        if (apiError.status === 401) {
          setPasswordError("Current password is incorrect");
        } else if (
          apiError.status === 0 ||
          apiError.message?.includes("Failed to connect")
        ) {
          setPasswordError(
            "Cannot connect to server. Please make sure the backend server is running."
          );
        } else {
          setPasswordError(
            apiError.message || "Failed to update password. Please try again."
          );
        }
        return;
      }
    }

    if (!profileUpdated && !passwordUpdated) {
      setAccountSuccess("No changes to update.");
    }

    if (profileUpdated || passwordUpdated) {
      setTimeout(() => setAccountSuccess(""), 5000);
    }
  };

  const ADMIN_EMAIL = "educompose@gmail.com";

  const sendDeleteConfirmationEmail = () => {
    const subject = encodeURIComponent("Account Deletion Confirmation Request");
    const body = encodeURIComponent(
      `Hello,\n\nPlease confirm deletion of the following account:\n\nUsername: ${username}\nEmail: ${email}\n\nThank you.`
    );

    window.open(
      `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`,
      "_blank"
    );
  };

  const handleRequestDeleteCode = async () => {
    setDeleteError("");
    setDeleteStatus("");
    setIsSendingDeleteCode(true);

    try {
      await authApi.requestDeleteCode();
      setDeleteStatus(
        "Verification code sent to your email. Please check your inbox."
      );
    } catch (error) {
      const apiError = error as { status?: number; message?: string };
      setDeleteError(
        apiError.message ||
          "Failed to send verification code. Please try again."
      );
    } finally {
      setIsSendingDeleteCode(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeleteStatus("");

    if (!deleteCode.trim()) {
      setDeleteError("Please enter the verification code sent to your email.");
      return;
    }

    setIsDeletingAccount(true);

    try {
      await authApi.deleteAccount(deleteCode.trim());
      sendDeleteConfirmationEmail();
      setDeleteStatus("Account deleted successfully. Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      const apiError = error as { status?: number; message?: string };
      setDeleteError(
        apiError.message || "Failed to delete account. Please try again."
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const resetDeleteState = () => {
    setDeleteCode("");
    setDeleteError("");
    setDeleteStatus("");
    setIsSendingDeleteCode(false);
    setIsDeletingAccount(false);
  };

  return (
    <div className='p-6 space-y-6 min-h-screen bg-neutral-300/10'>
      <h1 className='text-2xl font-bold text-neutral-900'>Settings</h1>

      {/* Account Settings */}
      <Card className='space-y-4'>
        <h2 className='text-lg font-semibold text-neutral-900'>
          Account Settings
        </h2>

        {accountSuccess && (
          <div className='p-3 bg-success-100 text-success-default rounded-rd text-sm'>
            {accountSuccess}
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-neutral-600 mb-1'>
              Username <span className='text-error-default'>*</span>
            </label>
            <input
              type='text'
              name='settings-username'
              autoComplete='off'
              value={username}
              onChange={(e) => {
                const formattedValue = formatUsernameInput(e.target.value);
                setUsername(formattedValue);
                setUsernameError("");
                setAccountSuccess("");
              }}
              className={`w-full rounded-rd border px-3 py-2 focus:outline-none focus:ring-2 ${
                usernameError
                  ? "border-error-default focus:ring-error-default"
                  : "border-neutral-300 focus:ring-primary-500"
              }`}
              placeholder='Enter username'
            />
            {usernameError && (
              <p className='text-error-default text-xs mt-1'>{usernameError}</p>
            )}
          </div>

          <div>
            <label className='block text-sm font-medium text-neutral-600 mb-1'>
              Email <span className='text-error-default'>*</span>
            </label>
            <input
              type='email'
              name='settings-email'
              autoComplete='off'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
                setAccountSuccess("");
              }}
              className={`w-full rounded-rd border px-3 py-2 focus:outline-none focus:ring-2 ${
                emailError
                  ? "border-error-default focus:ring-error-default"
                  : "border-neutral-300 focus:ring-primary-500"
              }`}
              placeholder='Enter email'
            />
            {emailError && (
              <p className='text-error-default text-xs mt-1'>{emailError}</p>
            )}
          </div>
        </div>

        {/* Change Password Section */}
        <div>
          <h3 className='text-lg font-semibold text-neutral-900 mt-8 mb-4'>
            Change Password
          </h3>

          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-neutral-600 mb-1'>
                Current Password
              </label>
              <div className='relative'>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name='settings-current-password'
                  autoComplete='current-password'
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordError("");
                    setAccountSuccess("");
                  }}
                  className={`w-full rounded-rd border px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                    passwordError
                      ? "border-error-default focus:ring-error-default"
                      : "border-neutral-300 focus:ring-primary-500"
                  }`}
                  placeholder='Enter current password'
                />
                <button
                  type='button'
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700'
                >
                  {showCurrentPassword ? (
                    <EyeOff className='w-5 h-5' />
                  ) : (
                    <Eye className='w-5 h-5' />
                  )}
                </button>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-neutral-600 mb-1'>
                  New Password
                </label>
                <div className='relative'>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name='settings-new-password'
                    autoComplete='new-password'
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError("");
                      setAccountSuccess("");
                    }}
                    maxLength={12}
                    className={`w-full rounded-rd border px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                      passwordError
                        ? "border-error-default focus:ring-error-default"
                        : "border-neutral-300 focus:ring-primary-500"
                    }`}
                    placeholder='Enter new password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700'
                  >
                    {showNewPassword ? (
                      <EyeOff className='w-5 h-5' />
                    ) : (
                      <Eye className='w-5 h-5' />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-neutral-600 mb-1'>
                  Confirm New Password
                </label>
                <div className='relative'>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name='settings-confirm-password'
                    autoComplete='new-password'
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError("");
                      setAccountSuccess("");
                    }}
                    maxLength={12}
                    className={`w-full rounded-rd border px-3 py-2 pr-10 focus:outline-none focus:ring-2 ${
                      passwordError
                        ? "border-error-default focus:ring-error-default"
                        : "border-neutral-300 focus:ring-primary-500"
                    }`}
                    placeholder='Confirm new password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700'
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='w-5 h-5' />
                    ) : (
                      <Eye className='w-5 h-5' />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {passwordError && (
              <p className='text-error-default text-sm'>{passwordError}</p>
            )}
          </div>
        </div>

        <div className='flex justify-end'>
          <Button variant='primary' onClick={handleUpdateAccount}>
            Update Account
          </Button>
        </div>
      </Card>

      {/* Delete Account Section */}
      <Card className='space-y-4 border-error-default/20'>
        <div className='flex items-start gap-3'>
          <AlertTriangle className='w-5 h-5 text-error-default mt-0.5 flex-shrink-0' />
          <div className='flex-1'>
            <h2 className='text-lg font-semibold text-neutral-900 mb-1'>
              Delete Account
            </h2>
            <p className='text-sm text-neutral-600 mb-4'>
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
            <Button
              variant='ghost'
              onClick={() => {
                resetDeleteState();
                setShowDeleteModal(true);
              }}
              className='text-error-default hover:bg-error-default border-error-default/20'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              Delete Account
            </Button>
          </div>
        </div>
      </Card>

      <div className='flex justify-end'>
        <Button variant='primary' size='md' onClick={handleSave}>
          Save changes
        </Button>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          resetDeleteState();
        }}
        title='Delete Account'
        size='md'
      >
        <div className='space-y-4'>
          <div className='flex items-start gap-3 p-4 bg-error-default/10 rounded-rd border border-error-default/20'>
            <AlertTriangle className='w-5 h-5 text-error-default mt-0.5 flex-shrink-0' />
            <div>
              <p className='text-sm font-medium text-neutral-900 mb-1'>
                This action cannot be undone
              </p>
              <p className='text-xs text-neutral-600'>
                This will permanently delete your account and remove all of your
                data from our servers.
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-neutral-700 mb-2'>
                Enter the 6-digit verification code sent to your email:
              </label>
              <input
                type='text'
                value={deleteCode}
                onChange={(e) => {
                  setDeleteCode(e.target.value);
                  setDeleteError("");
                }}
                className={`w-full rounded-rd border px-3 py-2 focus:outline-none focus:ring-2 ${
                  deleteError
                    ? "border-error-default focus:ring-error-default"
                    : "border-neutral-300 focus:ring-primary-500"
                }`}
                placeholder='Enter verification code'
              />
              {deleteError && (
                <p className='text-error-default text-sm mt-1'>{deleteError}</p>
              )}
              {deleteStatus && (
                <p className='text-success-default text-sm mt-1'>
                  {deleteStatus}
                </p>
              )}
            </div>
          </div>
          <Button
            variant='primary'
            onClick={handleRequestDeleteCode}
            disabled={isSendingDeleteCode}
          >
            {isSendingDeleteCode ? "Sending..." : "Send verification code"}
          </Button>
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='ghost'
              onClick={() => {
                setShowDeleteModal(false);
                resetDeleteState();
              }}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleDeleteAccount}
              disabled={!deleteCode.trim() || isDeletingAccount}
              className='bg-error-default hover:bg-error-dark disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Trash2 className='w-4 h-4 mr-2' />
              {isDeletingAccount ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
