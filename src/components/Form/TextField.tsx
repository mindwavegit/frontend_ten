import { alpha, styled } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";

const BootstrapInput = styled(InputBase)(({ theme }) => ({
  "label + &": {
    marginTop: theme.spacing(3),
  },
  "& .MuiInputBase-input": {
    borderRadius: 4,
    position: "relative",
    backgroundColor: "#F3F6F9",
    border: "1px solid",
    borderColor: "#E0E3E7",
    fontSize: 16,
    width: "auto",
    padding: "10px 12px",
    transition: theme.transitions.create([
      "border-color",
      "background-color",
      "box-shadow",
    ]),
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    "&:focus": {
      boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
      borderColor: theme.palette.primary.main,
    },
    "&:hover": {
      borderColor: "#B2BAC2",
    },
    "&.Mui-disabled": {
      backgroundColor: "#E9ECEF",
      borderColor: "#E0E3E7",
      color: "#6C757D",
    },
    "&.Mui-error": {
      borderColor: "#DC3545",
      "&:focus": {
        boxShadow: `${alpha("#DC3545", 0.25)} 0 0 0 0.2rem`,
        borderColor: "#DC3545",
      },
    },
    ...theme.applyStyles("dark", {
      backgroundColor: "#1A2027",
      borderColor: "#2D3843",
      color: "#fff",
      "&:focus": {
        boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
        borderColor: theme.palette.primary.main,
      },
    }),
  },
}));

const StyledInputLabel = styled(InputLabel)(({ theme }) => ({
  color: "#495057",
  fontSize: 14,
  fontWeight: 500,
  marginBottom: theme.spacing(1),
  "&.Mui-focused": {
    color: "#495057",
  },
  "&.Mui-error": {
    color: "#DC3545",
  },
  ...theme.applyStyles("dark", {
    color: "#fff",
    "&.Mui-focused": {
      color: "#fff",
    },
  }),
}));

const StyledFormHelperText = styled(FormHelperText)(({ theme }) => ({
  fontSize: 12,
  marginTop: theme.spacing(0.5),
  "&.Mui-error": {
    color: "#DC3545",
  },
}));

const TextInputField = ({
  label,
  placeholder,
  value,
  onChange,
  error = false,
  helperText,
  disabled = false,
  required = false,
  size = "medium",
  fullWidth = false,
  type = "text",
  ...props
}) => {
  const inputId = `bootstrap-input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <FormControl
      variant="standard"
      error={error}
      disabled={disabled}
      required={required}
      fullWidth={fullWidth}
      size={size}
    >
      {label && (
        <StyledInputLabel shrink htmlFor={inputId} error={error}>
          {label}
          {required && " *"}
        </StyledInputLabel>
      )}
      <BootstrapInput
        id={inputId}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        error={error}
        disabled={disabled}
        type={type}
        {...props}
      />
      {helperText && (
        <StyledFormHelperText error={error}>{helperText}</StyledFormHelperText>
      )}
    </FormControl>
  );
};

export default TextInputField;
