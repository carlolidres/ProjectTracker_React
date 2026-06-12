import { DeleteOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import {
  Alert, Button, Card, Col, Collapse, Form, Input, Modal, Row, Select, Space, Spin, Typography, message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { canEditProjectFields } from "@/lib/roleAccess";
import { generateHierarchyId } from "@/lib/utils";
import { getRegistryBundle } from "@/services/registryService";
import {
  archiveProject,
  findDuplicateProjects,
  getProjectById,
  listActiveProjects,
  saveProject,
  updateProject,
} from "@/services/projectService";
import type { BatchControl, MoControl, PoControl, ProjectHierarchy } from "@/types";

function emptyPo(): PoControl {
  return {
    po_control_no: "",
    fg_month: "",
    business_unit: "",
    updatedDocsVer: "",
    cnf_reference: "",
    qrmr_ref_no: "",
    change_description: "",
    cnf_status: "",
    client_approval_target_date: "",
    remarks: "",
    manufacturing_start_week: "",
    mo_bmr_po_submission_status: "",
    mo_bmr_po_target_date: "",
    mo_bmr_po_activation_status: "",
    mo_bmr_po_activation_date: "",
    protocol_no: "",
    protocol_Status: "",
    protocol_target_date: "",
    Val_Activity: "",
    Val_Stability: "",
    Val_Batch_Seq_No: "",
    Val_Strategy: "",
    Val_Strategy_remarks: "",
    val_report_no: "",
    Report_Sub_Status: "",
    Report_target_Date: "",
    ar_availability_date: "",
    packaging_schedule: "",
    final_status: "OPEN",
    final_status_other: "",
  };
}

function emptyMo(): MoControl {
  return { mo_control_no: "", po_controls: [emptyPo()] };
}

function emptyBatch(): BatchControl {
  return { unique_batch: "", mo_controls: [emptyMo()] };
}

function emptyProject(): ProjectHierarchy {
  return {
    project_id: "N/A",
    project_owner: "",
    activity_type: "",
    client_name: "",
    so_no: "",
    fg_code: "",
    product_name: "",
    batches: [emptyBatch()],
  };
}

export function ProjectEntryPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [project, setProject] = useState<ProjectHierarchy>(emptyProject());
  const [registry, setRegistry] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = profile?.role;
  const canEditAm = role ? canEditProjectFields(role, "am") : false;
  const canEditPp = role ? canEditProjectFields(role, "pp") : false;
  const canEditTsd = role ? canEditProjectFields(role, "tsd") : false;
  const canEditVal = role ? canEditProjectFields(role, "val") : false;
  const canEditQc = role ? canEditProjectFields(role, "qc") : false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await getRegistryBundle();
      setRegistry(bundle);
      if (projectIdParam) {
        const existing = await getProjectById(projectIdParam);
        if (existing) setProject(existing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateProjectHead(field: keyof ProjectHierarchy, value: string) {
    setProject((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (!user?.email) return;
    setSaving(true);
    setError(null);
    try {
      const allProjects = await listActiveProjects();
      const duplicates = findDuplicateProjects(allProjects, project);
      if (duplicates.length) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: "Possible duplicate project",
            content: `Found ${duplicates.length} existing record(s) with the same client and product. Continue saving?`,
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!confirmed) {
          setSaving(false);
          return;
        }
      }

      const isNew = project.project_id === "N/A" || !projectIdParam;
      if (isNew) {
        const result = await saveProject(project, user.email);
        message.success(`Project ${result.project_id} created`);
        setProject((current) => ({ ...current, project_id: result.project_id }));
      } else {
        await updateProject(project.project_id, project, user.email);
        message.success("Project updated");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!user?.email || project.project_id === "N/A") return;
    Modal.confirm({
      title: "Archive project?",
      content: "This will mark all PO lines as inactive.",
      onOk: async () => {
        await archiveProject(project.project_id, user.email!);
        message.success("Project archived");
        setProject(emptyProject());
      },
    });
  }

  function copyFromFirstPo(batchIndex: number, moIndex: number, poIndex: number) {
    const firstPo = project.batches[0]?.mo_controls[0]?.po_controls[0];
    if (!firstPo || (batchIndex === 0 && moIndex === 0 && poIndex === 0)) return;
    setProject((current) => {
      const next = structuredClone(current);
      const target = next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex];
      target.protocol_no = firstPo.protocol_no;
      target.protocol_Status = firstPo.protocol_Status;
      target.protocol_target_date = firstPo.protocol_target_date;
      target.Val_Strategy = firstPo.Val_Strategy;
      return next;
    });
    message.info("Copied validation fields from first PO");
  }

  if (loading) {
    return (
      <AppShell>
        <div className="page-loading"><Spin size="large" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Projects</Typography.Title>
          <Typography.Text type="secondary">Hierarchical project entry: Project → Batch → MO → PO</Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>Reset</Button>
          <Button icon={<SaveOutlined />} type="primary" loading={saving} onClick={() => void handleSave()}>
            Save Project
          </Button>
          {project.project_id !== "N/A" ? (
            <Button danger icon={<DeleteOutlined />} onClick={() => void handleArchive()}>Archive</Button>
          ) : null}
        </Space>
      </div>

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Card title="Project Header" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Project ID">
              <Input value={project.project_id} disabled />
            </Form.Item>
          </Col>
          {(["project_owner", "activity_type", "client_name", "so_no", "fg_code", "product_name"] as const).map((field) => (
            <Col xs={24} md={8} key={field}>
              <Form.Item label={field.replace(/_/g, " ")}>
                <Input
                  disabled={!canEditAm}
                  value={project[field]}
                  onChange={(e) => updateProjectHead(field, e.target.value)}
                />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Card>

      <Collapse
        items={project.batches.map((batch, batchIndex) => ({
          key: `batch-${batchIndex}`,
          label: `Batch ${batchIndex + 1}: ${batch.unique_batch || "New batch"}`,
          extra: (
            <Button
              size="small"
              icon={<PlusOutlined />}
              disabled={!canEditAm}
              onClick={(e) => {
                e.stopPropagation();
                setProject((current) => ({
                  ...current,
                  batches: [...current.batches, { ...emptyBatch(), batch_instance_id: generateHierarchyId("BAT") }],
                }));
              }}
            >
              Add Batch
            </Button>
          ),
          children: (
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <Input
                addonBefore="Unique Batch"
                disabled={!canEditAm}
                value={batch.unique_batch}
                onChange={(e) => {
                  const value = e.target.value;
                  setProject((current) => {
                    const next = structuredClone(current);
                    next.batches[batchIndex].unique_batch = value;
                    return next;
                  });
                }}
              />
              {batch.mo_controls.map((mo, moIndex) => (
                <Card
                  key={`mo-${moIndex}`}
                  size="small"
                  title={`MO ${moIndex + 1}`}
                  extra={
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      disabled={!canEditAm}
                      onClick={() => {
                        setProject((current) => {
                          const next = structuredClone(current);
                          next.batches[batchIndex].mo_controls.push({ ...emptyMo(), mo_instance_id: generateHierarchyId("MO") });
                          return next;
                        });
                      }}
                    >
                      Add MO
                    </Button>
                  }
                >
                  <Input
                    addonBefore="MO Control No"
                    disabled={!canEditAm}
                    value={mo.mo_control_no}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProject((current) => {
                        const next = structuredClone(current);
                        next.batches[batchIndex].mo_controls[moIndex].mo_control_no = value;
                        return next;
                      });
                    }}
                    style={{ marginBottom: 12 }}
                  />
                  {mo.po_controls.map((po, poIndex) => (
                    <Card
                      key={`po-${poIndex}`}
                      type="inner"
                      title={`PO ${poIndex + 1}`}
                      extra={
                        <Space>
                          <Button size="small" onClick={() => copyFromFirstPo(batchIndex, moIndex, poIndex)}>
                            Copy from 1st PO
                          </Button>
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            disabled={!canEditAm}
                            onClick={() => {
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls.push(emptyPo());
                                return next;
                              });
                            }}
                          >
                            Add PO
                          </Button>
                        </Space>
                      }
                    >
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={8}>
                          <Input addonBefore="PO Control No" disabled={!canEditAm} value={po.po_control_no}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].po_control_no = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Input addonBefore="FG Month" disabled={!canEditAm} value={po.fg_month}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].fg_month = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Select
                            style={{ width: "100%" }}
                            placeholder="Business Unit"
                            disabled={!canEditAm}
                            value={po.business_unit || undefined}
                            options={(registry.business_unit ?? []).map((v) => ({ label: v, value: v }))}
                            onChange={(value) => {
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].business_unit = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Select
                            style={{ width: "100%" }}
                            placeholder="CNF Status"
                            disabled={!canEditAm}
                            value={po.cnf_status || undefined}
                            options={(registry.cnf_status ?? []).map((v) => ({ label: v, value: v }))}
                            onChange={(value) => {
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].cnf_status = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Input addonBefore="CNF Reference" disabled={!canEditAm} value={po.cnf_reference}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].cnf_reference = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Input addonBefore="Mfg Start Week" disabled={!canEditPp} value={po.manufacturing_start_week}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].manufacturing_start_week = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Select
                            style={{ width: "100%" }}
                            placeholder="MO/BMR/PO Submission"
                            disabled={!canEditTsd}
                            value={po.mo_bmr_po_submission_status || undefined}
                            options={(registry.yn_status ?? []).map((v) => ({ label: v, value: v }))}
                            onChange={(value) => {
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].mo_bmr_po_submission_status = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Input addonBefore="Protocol No" disabled={!canEditVal} value={po.protocol_no}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].protocol_no = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Input addonBefore="AR Availability" disabled={!canEditQc} value={po.ar_availability_date}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].ar_availability_date = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Select
                            style={{ width: "100%" }}
                            placeholder="Final Status"
                            disabled={!canEditPp}
                            value={po.final_status || undefined}
                            options={(registry.final_status ?? []).map((v) => ({ label: v, value: v }))}
                            onChange={(value) => {
                              setProject((current) => {
                                const next = structuredClone(current);
                                next.batches[batchIndex].mo_controls[moIndex].po_controls[poIndex].final_status = value;
                                return next;
                              });
                            }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Card>
              ))}
            </Space>
          ),
        }))}
      />
    </AppShell>
  );
}
